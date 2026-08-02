// What gets measured, as data. Kept separate from the runner so the routes and
// the run count can be read by a test without launching a browser.

// Production by default, so `npm run lighthouse` with no setup measures what a
// visitor actually gets. ONYX_BASE_URL points it at a Vercel preview instead,
// which is how a change is compared against production before it ships.
export const PRODUCTION_URL = "https://onyx-kappa-five.vercel.app";
export const BASE_URL = process.env.ONYX_BASE_URL ?? PRODUCTION_URL;

// Nine runs, reported as a median. A single Lighthouse pass is not a citable
// number because the score moves from run to run.
//
// Five was the original figure and proved too few. The first real measurement
// returned a 14 point spread on the dashboard, runs ranging 84 to 98, because
// total blocking time is CPU bound and therefore sensitive to whatever else the
// machine is doing. An odd count is deliberate, so the median is a score some
// run actually produced rather than an average of two that neither did.
export const RUNS_PER_ROUTE = 9;

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
