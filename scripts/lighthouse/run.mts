// Measures production with Lighthouse, signed in as the demo user.
//
// The only file here that touches a browser or the network. Run it with
// `npm run lighthouse`. It needs no credentials and no .env file: the demo
// button on the sign in page calls a server action that holds both secrets in
// Vercel, so clicking it is enough to authenticate.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import type { Browser, Page } from "puppeteer";
import lighthouse from "lighthouse";
import {
  BASE_URL,
  ROUTES,
  RUNS_PER_ROUTE,
  measurementOrder,
  type Route,
} from "./targets.mts";
import {
  summarizeRoute,
  type MinimalLhr,
  type RouteSummary,
} from "./summarize.mts";

// Reports are namespaced by target, so measuring a preview cannot overwrite the
// production numbers it is being compared against.
const OUT_DIR = path.join(
  process.cwd(),
  "lighthouse-reports",
  new URL(BASE_URL).hostname.split(".")[0],
);

// A dashboard-only heading. Verified absent from the signed out /sign-in page,
// unlike the primary nav, which the root layout renders on every page.
//
// Matched against a heading element's textContent, deliberately, and not
// against document.body.innerText. The heading carries a Tailwind `uppercase`
// class, and innerText returns rendered text, so it reads "RECENT WORKOUTS"
// and a title case comparison silently never matches. Matching body.textContent
// instead would dodge that but introduce the opposite fault, since the RSC
// payload sits in a script tag inside the body and would satisfy the check even
// if nothing rendered.
const AUTH_MARKER = "Recent workouts";

// Runs in the browser. Kept as a standalone expression so the sign in wait and
// the mid run re-check cannot drift apart.
function hasAuthMarker(marker: string): boolean {
  return Array.from(document.querySelectorAll("h1,h2,h3")).some(
    (h) => h.textContent?.trim() === marker,
  );
}

// Ubuntu 23.10 and newer restrict unprivileged user namespaces through
// AppArmor, so Chrome cannot start its own sandbox and refuses to launch. The
// sandbox exists to contain hostile web content, and this script only ever
// visits one known origin, runs locally on demand, and never runs in CI or
// against untrusted input. Recorded in docs/lighthouse.md as a condition of
// the measurement rather than left implicit here.
const LAUNCH_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];

// Vercel preview deployments sit behind Deployment Protection, so a headless
// browser with no Vercel session is redirected to vercel.com/sso-api and never
// reaches the app. Visiting the share URL once sets a bypass cookie on the
// browser context, which every later navigation reuses. Production needs none
// of this, so the whole step is skipped when no token is given.
async function bypassDeploymentProtection(page: Page): Promise<void> {
  const token = process.env.ONYX_SHARE_TOKEN;
  if (!token) return;
  await page.goto(`${BASE_URL}/?_vercel_share=${token}`, {
    waitUntil: "domcontentloaded",
  });

  // Verified rather than announced, because a token that no longer works fails
  // silently in the worst possible way. Vercel answers a stale one by
  // redirecting to its own login page, which is a real page full of real
  // buttons, so every later step still succeeds and Lighthouse cheerfully
  // reports vercel.com under this app's name. Two runs were lost to exactly
  // that before this check existed.
  //
  // A token goes stale on its own schedule, and also the moment a newer one is
  // minted for the project, so comparing two deployments invalidates the first
  // token as soon as the second is created. That makes this the normal case,
  // not a rare one: mint a token, measure, then mint the next.
  const landed = new URL(page.url());
  const expected = new URL(BASE_URL);
  if (landed.hostname !== expected.hostname) {
    throw new Error(
      `The share token did not grant access to ${BASE_URL}. The browser ended ` +
        `up on ${landed.origin} instead, so nothing measured from here would ` +
        `describe this app. Mint a fresh token and note that minting one for ` +
        `another deployment invalidates it again.`,
    );
  }
  console.log("Deployment protection bypassed.");
}

async function signInAsDemo(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/sign-in`, { waitUntil: "domcontentloaded" });

  // Waited for rather than read once. A preview that has just been deployed,
  // or one that has idled back down, can take longer to answer than a single
  // synchronous look allows, and the old version reported that as the demo
  // being unconfigured, which sent a diagnosis to entirely the wrong place.
  try {
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll("button")).some(
          (b) => b.textContent?.trim() === "Try the demo",
        ),
      { timeout: 60_000 },
    );
  } catch {
    throw new Error(
      `No 'Try the demo' button appeared on ${BASE_URL}/sign-in within 60s. ` +
        "The page only renders it when DEMO_EMAIL is set on the deployment, " +
        `so check that first. The browser is on ${page.url()}.`,
    );
  }

  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Try the demo",
    );
    button?.click();
  });

  // The server action redirects to /, which is a client side navigation, so
  // wait on the rendered result rather than on a load event.
  await page.waitForFunction(hasAuthMarker, { timeout: 60_000 }, AUTH_MARKER);
}

async function measure(page: Page, route: Route): Promise<MinimalLhr[]> {
  const results: MinimalLhr[] = [];

  for (let run = 1; run <= RUNS_PER_ROUTE; run++) {
    const result = await lighthouse(
      `${BASE_URL}${route.path}`,
      // disableStorageReset is what makes an authenticated measurement possible
      // at all. Lighthouse clears cookies between runs by default, which would
      // sign the session out and quietly measure a redirect instead.
      { disableStorageReset: true },
      undefined,
      page,
    );

    if (!result?.lhr) {
      throw new Error(`Lighthouse returned no result for ${route.path}`);
    }
    const lhr = result.lhr as unknown as MinimalLhr;

    await writeFile(
      path.join(OUT_DIR, `${route.label}-run-${run}.json`),
      JSON.stringify(lhr, null, 2),
    );

    const perf = Math.round((lhr.categories.performance?.score ?? 0) * 100);
    console.log(
      `  ${route.label} run ${run}/${RUNS_PER_ROUTE}: performance ${perf}`,
    );

    results.push(lhr);
  }

  return results;
}

// Returns to the dashboard and confirms the marker is still there. Only the
// dashboard carries it, so the check has to navigate there rather than test
// whatever page was just measured. Catches a session dropped mid run, which
// would otherwise yield a confident score for a redirect.
async function verifyStillSignedIn(page: Page, measured: string): Promise<void> {
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2" });
  const present = await page.evaluate(hasAuthMarker, AUTH_MARKER);
  if (!present) {
    throw new Error(
      `The demo session was lost while measuring ${measured}. The numbers from ` +
        "this run describe a signed out page and must be discarded.",
    );
  }
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  let browser: Browser | undefined;
  try {
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      args: LAUNCH_ARGS,
      ignoreDefaultArgs: ["--enable-automation"],
    });
    const page = await browser.newPage();
    // Production is warm and answers in milliseconds. A preview that was just
    // deployed cold starts, and the default 30 seconds is not always enough for
    // the first navigation against one.
    page.setDefaultNavigationTimeout(120_000);

    await bypassDeploymentProtection(page);

    // Public routes first, while there is still no session to redirect them
    // away. See measurementOrder for what measuring them afterwards silently
    // produced instead.
    const { before, after } = measurementOrder(ROUTES);
    const byLabel = new Map<string, RouteSummary>();

    for (const route of before) {
      console.log(`Measuring ${route.path}, signed out`);
      byLabel.set(
        route.label,
        summarizeRoute(route.label, route.path, await measure(page, route)),
      );
    }

    console.log(`\nSigning in as the demo user at ${BASE_URL}`);
    await signInAsDemo(page);
    console.log("Signed in.\n");

    for (const route of after) {
      console.log(`Measuring ${route.path}`);
      byLabel.set(
        route.label,
        summarizeRoute(route.label, route.path, await measure(page, route)),
      );
      await verifyStillSignedIn(page, route.path);
    }

    // Reported in the order the routes are declared, not the order they were
    // measured, so the output stays comparable run to run.
    const summaries = ROUTES.map((r) => byLabel.get(r.label)).filter(
      (s): s is RouteSummary => s !== undefined,
    );

    await writeFile(
      path.join(OUT_DIR, "summary.json"),
      JSON.stringify(summaries, null, 2),
    );

    console.log("\nMedians:");
    for (const s of summaries) {
      const tbt = s.metrics["total-blocking-time"];
      const srt = s.metrics["server-response-time"];
      console.log(
        `  ${s.path}  performance ${s.scores.performance} ` +
          `(spread ${s.spread.performance})  ` +
          `accessibility ${s.scores.accessibility} ` +
          `(spread ${s.spread.accessibility})` +
          // The score is noisy enough that the milliseconds are the number to
          // watch across an optimization pass.
          (tbt ? `  blocking ${tbt.median}ms (${tbt.min} to ${tbt.max})` : "") +
          // Printed beside it so a server side change, which moves this and
          // leaves blocking time alone, is visible from the command itself
          // rather than only from the raw reports.
          (srt ? `  server ${srt.median}ms (${srt.min} to ${srt.max})` : ""),
      );
    }
    console.log(`\nRaw reports and summary.json written to ${OUT_DIR}`);
  } finally {
    await browser?.close();
  }
}

await main();
