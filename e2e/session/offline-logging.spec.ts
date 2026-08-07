import { test, expect, type Page } from "@playwright/test";

// The feature the whole project is built around, and the only test that
// exercises it the way a user does.
//
// The sync is triggered by the window "online" event registered in
// ActiveWorkout, and useOnline reads navigator.onLine. Both were proven to
// respond to the browser's offline emulation with a standalone probe before
// this file was written: navigator.onLine flipped both ways and the events
// fired in order.

// Seeded by buildDemoSeed. Its first exercise is Bench Press with a target of
// four sets, so logging three never collapses the input row.
const ROUTINE = "Push Day";

// The first card on the screen is the routine's first exercise. Scoping by
// .first() rather than by card, because the cards carry no test id and adding
// one would mean touching application code for the sake of a test.
async function logSet(page: Page, reps: number, weight: number) {
  await page.getByLabel("Reps", { exact: true }).first().fill(String(reps));
  await page.getByLabel("Weight", { exact: true }).first().fill(String(weight));
  await page.getByRole("button", { name: "Log set" }).first().click();
}

// Matched loosely on purpose. The row renders "Set 1: 8 for 135 lbs", but the
// weight is a number so trailing zeros could differ, and the pending dot sits
// in the same element.
const setRow = (n: number, reps: number, weight: number) =>
  new RegExp(`Set ${n}:\\s*${reps} for ${weight}\\s*lbs`);

const pendingDot = (page: Page) => page.getByRole("img", { name: "Not yet synced" });

test("keeps sets logged offline and syncs them on reconnect", async ({ page, context }) => {
  await page.goto("/log");
  await page.getByRole("button", { name: ROUTINE }).click();
  await expect(page).toHaveURL(/\/log\/[0-9a-f-]{36}$/);
  const sessionUrl = page.url();

  // Baseline. If logging does not work with a connection then nothing after
  // this means anything, so it is asserted separately rather than folded in.
  await logSet(page, 8, 135);
  await expect(page.getByText(setRow(1, 8, 135))).toBeVisible();
  await expect(pendingDot(page)).toHaveCount(0, { timeout: 15_000 });

  await context.setOffline(true);
  await expect(page.getByText(/Offline\. Your sets are saved/)).toBeVisible();

  // Local first: both render immediately, with no connection at all.
  await logSet(page, 8, 135);
  await logSet(page, 7, 135);
  await expect(page.getByText(setRow(2, 8, 135))).toBeVisible();
  await expect(page.getByText(setRow(3, 7, 135))).toBeVisible();
  await expect(pendingDot(page)).toHaveCount(2);

  // NO RELOAD HERE, deliberately, and it is worth knowing why.
  //
  // Reloading this screen while offline does not bring the workout back. The
  // service worker caches only "/" and the manifest, so a failed navigation to
  // /log/<id> falls back to that shell and renders an empty page. Measured on
  // 2026-08-06: one set row before the reload, zero after, no headings, empty
  // body, same URL.
  //
  // NOTHING IS LOST WHEN THAT HAPPENS. The sets are still in IndexedDB and
  // still sync on reconnect, which is what the rest of this test proves. It is
  // the view that does not come back, not the data. Asserting persistence
  // across an offline reload would be asserting a behaviour the app does not
  // have, so the local first guarantee is proven by the sync below instead.

  await context.setOffline(false);
  await expect(pendingDot(page)).toHaveCount(0, { timeout: 30_000 });

  // The actual proof. A second context has an empty IndexedDB, so anything it
  // renders came from the server. Asserting against the page above would pass
  // just as well if the sets had never left the device.
  const fresh = await context.browser()!.newContext({
    storageState: await context.storageState(),
  });
  const freshPage = await fresh.newPage();
  await freshPage.goto(sessionUrl);
  await expect(freshPage.getByText(setRow(1, 8, 135))).toBeVisible();
  await expect(freshPage.getByText(setRow(2, 8, 135))).toBeVisible();
  await expect(freshPage.getByText(setRow(3, 7, 135))).toBeVisible();
  await fresh.close();

  // Leave no open session behind. startSession resumes any session with a null
  // completed_at regardless of routine, so a stray one would be inherited by
  // whatever runs next, including the other browser project.
  await page.goto(sessionUrl);
  await page.getByRole("button", { name: "Finish workout" }).click();
  await expect(page.getByRole("heading", { name: "Recent workouts" })).toBeVisible({
    timeout: 30_000,
  });
});
