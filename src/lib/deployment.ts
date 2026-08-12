// Which deployment the browser is actually talking to. Kept as a pure
// function over a plain object, like buildCsp in src/lib/security/csp.ts, so
// the whole rule is testable without a server or a browser.
export type DeploymentEnvironment = {
  // VERCEL_PROJECT_PRODUCTION_URL, the project's production domain. A system
  // variable available at build and runtime in every environment, which is
  // what lets a preview know what it is not. Already read this way for the
  // QStash callback at src/lib/workout/actions.ts:288. Absent off Vercel.
  canonicalHost: string | undefined;
  // VERCEL_ENV: "production", "preview" or "development". Absent off Vercel.
  vercelEnv: string | undefined;
};

export type HostVerdict =
  | { offCanonical: false }
  | { offCanonical: true; actual: string; canonical: string; environment: string };

// Adding a preview or deployment URL to the iPhone home screen pins that
// install to that build forever. It then looks completely normal while
// running code that can be months stale, which on 2026-08-12 meant an app
// signing in against a deactivated Supabase key. Nothing on screen said so.
//
// Every unknown resolves to silence. A false alarm on the real app would be
// worse than the bug this guards against, so the warning fires only when both
// hosts are known and they genuinely disagree.
export function checkHost(actual: string, env: DeploymentEnvironment): HostVerdict {
  const canonical = env.canonicalHost;
  if (!canonical || !actual) return { offCanonical: false };
  if (actual === canonical) return { offCanonical: false };
  return {
    offCanonical: true,
    actual,
    canonical,
    environment: env.vercelEnv ?? "unknown",
  };
}
