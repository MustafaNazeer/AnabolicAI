import { test, expect } from "@playwright/test";
import { STATIC_SECURITY_HEADERS } from "@/lib/security/headers";

// Guards on the request layer, which jsdom cannot reach at all. Every assertion
// here pins a defect that reached production once, and none of them needs an
// account: they all describe what a signed out stranger gets.

const PROTECTED = ["/", "/log", "/progress", "/settings"];

test("redirects a signed out visitor away from every private route", async ({ request }) => {
  for (const path of PROTECTED) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), `${path} should redirect a signed out visitor`).toBe(307);
    expect(response.headers()["location"]).toBe("/sign-in");
  }
});

test("serves the sign in page itself", async ({ request }) => {
  const response = await request.get("/sign-in", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
});

// The gap the security review found. The matcher used to exclude every ".png"
// path on the assumption they were all static files. A nonexistent one is not:
// it falls through to the app's 404, a real HTML document rendered through the
// root layout, which then carried no policy at all.
//
// Signed out the redirect fires before the 404 is ever rendered, and that is
// what makes this a good guard: a 307 here proves the middleware SEES the path.
// If the blanket exclusion came back, this would be a 404 with no policy.
test("runs the middleware on a nonexistent png rather than excluding it", async ({ request }) => {
  const response = await request.get("/definitely-not-a-real-file.png", { maxRedirects: 0 });
  expect(response.status(), "an excluded path would 404 instead").toBe(307);
  expect(response.headers()["content-security-policy"]).toBeTruthy();
});

// Fixed by accident alongside the above. /icon.svg was never excluded, so it
// returned 307 to /sign-in and the SVG favicon silently failed on the one page
// a signed out visitor ever sees.
test("serves the favicon to a signed out visitor", async ({ request }) => {
  const response = await request.get("/icon.svg", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
});

test("serves the service worker and the manifest", async ({ request }) => {
  for (const path of ["/sw.js", "/manifest.webmanifest"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), `${path} should be served, not redirected`).toBe(200);
  }
});

// Imported rather than restated, deliberately. The unit suite already covers
// what the constant contains; what only a real request can show is that what
// next.config.ts declares actually arrives on the response.
test("delivers every static security header the config declares", async ({ request }) => {
  const response = await request.get("/sign-in", { maxRedirects: 0 });
  const headers = response.headers();
  for (const { key, value } of STATIC_SECURITY_HEADERS) {
    expect(headers[key.toLowerCase()], `${key} should be delivered`).toBe(value);
  }
});

// The nonce CSP is inert if the layout ever stops stamping it, and all seven CI
// checks would stay green. The nonce is deliberately absent from style-src;
// that rule is pinned by a unit test and is not restated here.
//
// Read through the .nonce PROPERTY, never getAttribute. Browsers blank the
// nonce content attribute after parsing, so getAttribute returns "" for every
// script and the assertion would fail while the policy was perfectly correct.
test("stamps the response nonce onto every script tag", async ({ page }) => {
  const response = await page.goto("/sign-in");
  const declared = (response?.headers()["content-security-policy"] ?? "").match(
    /'nonce-([^']+)'/,
  )?.[1];
  expect(declared, "the policy should declare a nonce").toBeTruthy();

  const nonces = await page.evaluate(() =>
    Array.from(document.querySelectorAll("script")).map((s) => s.nonce),
  );
  expect(nonces.length, "the page should carry scripts").toBeGreaterThan(0);
  for (const nonce of nonces) {
    expect(nonce).toBe(declared);
  }
});

test("mints a fresh nonce for every request", async ({ request }) => {
  const read = async () => {
    const response = await request.get("/sign-in", { maxRedirects: 0 });
    return (response.headers()["content-security-policy"] ?? "").match(/'nonce-([^']+)'/)?.[1];
  };
  const first = await read();
  const second = await read();
  expect(first).toBeTruthy();
  expect(second).not.toBe(first);
});

// The scheduler callback was redirecting to /sign-in, so the handler never ran
// and the notification would have silently never arrived. Found by curling the
// live endpoint and seeing 307 where a rejection belonged.
//
// Asserted as "not a redirect" rather than as 403, because without the QStash
// signing keys the route correctly fails closed with 503, and those keys are
// Production and Preview only. Pinning 403 would pass only on a deployment.
test("rejects an unsigned scheduler callback rather than redirecting it", async ({ request }) => {
  const response = await request.post("/api/rest/complete", {
    data: { sessionId: "not-a-real-session", token: "not-a-real-token" },
    maxRedirects: 0,
  });
  expect(response.status(), "a redirect here means the handler never runs").toBeGreaterThanOrEqual(
    400,
  );
});

// The directory prefixes "icons/.*" and "splash/.*" excluded every path under
// both, including ones with no file behind them. Those fall through to the
// app's 404, a real HTML document rendered through the root layout, which then
// carried no policy. Same defect class as the blanket png exclusion above, one
// directory narrower.
test("runs the middleware on a nonexistent brand asset rather than excluding it", async ({ request }) => {
  for (const path of ["/splash/nope.png", "/icons/nope.png"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), `${path} should reach the middleware`).toBe(307);
    expect(
      response.headers()["content-security-policy"],
      `${path} should carry a policy`,
    ).toBeTruthy();
  }
});

// The counterpart guard, and the reason the pattern is narrow rather than
// absent. Tightening the matcher must never start redirecting the real files,
// or a cold install gets no icon and no splash screen.
test("still serves the real brand assets to a signed out visitor", async ({ request }) => {
  const real = [
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/icon-maskable-512.png",
    "/splash/splash-1170x2532.png",
  ];
  for (const path of real) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), `${path} should be served, not redirected`).toBe(200);
  }
});
