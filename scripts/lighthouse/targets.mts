// What gets measured, as data. Kept separate from the runner so the routes and
// the run count can be read by a test without launching a browser.

export const BASE_URL = "https://onyx-kappa-five.vercel.app";

// Five runs, reported as a median. A single Lighthouse pass is not a citable
// number because the score moves from run to run.
export const RUNS_PER_ROUTE = 5;

export type Route = {
  path: string;
  label: string;
  // Whether reaching this route needs the demo session. /sign-in does not, and
  // is measured as the public baseline.
  authenticated: boolean;
};

// The two screens that render real data work, plus the public baseline. The
// logging screen is deliberately absent: every seeded session carries a
// completedAt, so there is no active workout to open, and creating one would
// write to live demo data on every run.
export const ROUTES: readonly Route[] = [
  { path: "/", label: "dashboard", authenticated: true },
  { path: "/progress", label: "progress", authenticated: true },
  { path: "/sign-in", label: "sign-in", authenticated: false },
];

// There is deliberately no category list and no form factor here. Lighthouse
// runs all four categories on the mobile preset by default, and passing them
// again would only restate the default in a second place that could drift from
// it. What actually ran is read back off the result instead, in summarize.mts,
// so the recorded number always describes the real run.
