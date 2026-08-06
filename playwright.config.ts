import { defineConfig, devices } from "@playwright/test";

// The suite drives a production build, not the dev server. Turbopack dev here
// applies no middleware response at all, proven with a zero dependency
// middleware, so the policy and redirect guards would silently have nothing to
// assert against.
//
// Port 3100 rather than 3000, so a dev server left running cannot be mistaken
// for the thing under test.

try {
  process.loadEnvFile(".env.local");
} catch {
  throw new Error(
    "No .env.local. The end to end suite needs a real Supabase project and two " +
      "dedicated accounts. Copy .env.local.example and fill it in.",
  );
}

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Ubuntu 23.10 and newer restrict unprivileged user namespaces through AppArmor,
// so Chrome cannot start its own sandbox and refuses to launch. The sandbox
// exists to contain hostile web content, and this browser visits one known local
// origin, on demand, never in CI, never against untrusted input. Same reasoning
// as scripts/lighthouse/run.mts. WebKit neither needs nor accepts the flag.
const CHROMIUM_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];

// The phone the app is designed for. 393 wide, which is what the sticky header
// diagnosis was measured against.
const PHONE = devices["iPhone 15"];

// WEBKIT IS DEFINED BUT NOT IN THE DEFAULT RUN, and this is an environment
// limit rather than a decision about coverage.
//
// iOS Safari is the real target, so WebKit is the engine worth testing. It
// cannot launch on this machine: Ubuntu 25.10, while Playwright's prebuilt
// WebKit is linked against Ubuntu 24.04 sonames. Checked on 2026-08-06,
// libicu74 and libxml2 have no candidate in the 25.10 archive at all, which
// ships libicu76 and libxml2-16 instead, so `playwright install-deps` cannot
// fix it either.
//
// The projects below are real and current. `npm run test:e2e` selects chromium;
// on a supported OS, `npx playwright test --project=webkit` runs them as they
// stand, and dropping the flag from the script makes WebKit the default again.
export default defineConfig({
  testDir: "e2e",
  // One at a time. Separate accounts stop the two browsers colliding, but every
  // spec inside one project still shares that project's single account.
  workers: 1,
  fullyParallel: false,
  // Zero deliberately. A retry would hide exactly the instability worth knowing
  // about in a new harness.
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  // Specs are split by whether they need an account, and the projects follow
  // that split. e2e/public describes what a signed out stranger gets, so it
  // takes no setup dependency and no saved session: dragging an account reset
  // into a test about redirects would couple two unrelated things.
  // e2e/session needs a signed in account and therefore the reset.
  projects: [
    {
      name: "chromium-public",
      testMatch: /public\/.*\.spec\.ts/,
      use: {
        ...PHONE,
        defaultBrowserType: "chromium",
        launchOptions: { args: CHROMIUM_ARGS },
      },
    },
    {
      name: "chromium-setup",
      testMatch: /auth\.setup\.ts/,
      use: {
        ...PHONE,
        defaultBrowserType: "chromium",
        launchOptions: { args: CHROMIUM_ARGS },
      },
    },
    {
      name: "chromium",
      dependencies: ["chromium-setup"],
      testMatch: /session\/.*\.spec\.ts/,
      use: {
        ...PHONE,
        defaultBrowserType: "chromium",
        launchOptions: { args: CHROMIUM_ARGS },
        storageState: "e2e/.auth/chromium.json",
      },
    },
    {
      name: "webkit-public",
      testMatch: /public\/.*\.spec\.ts/,
      use: { ...PHONE },
    },
    {
      name: "webkit-setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...PHONE },
    },
    {
      name: "webkit",
      dependencies: ["webkit-setup"],
      testMatch: /session\/.*\.spec\.ts/,
      use: { ...PHONE, storageState: "e2e/.auth/webkit.json" },
    },
  ],
  webServer: {
    // Serve only. The build is explicit in the npm script, so a run can never
    // quietly serve a stale build.
    command: `npx next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
