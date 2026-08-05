// Everything the policy varies on, as a plain object, so the builder is a
// pure function and the entire policy is testable without a server.
export type CspEnvironment = {
  // NODE_ENV is "development": React needs eval to rebuild server error
  // stacks in the browser, and hot reload needs a websocket.
  dev: boolean;
  // VERCEL_ENV is "preview": Vercel injects its toolbar from vercel.live.
  // Only connect-src and frame-src admit it; a host source in script-src is
  // ignored under 'strict-dynamic', so the toolbar script may fail to load
  // on previews and that is accepted.
  preview: boolean;
  // The one external origin the browser talks to.
  supabaseUrl: string | undefined;
};

function origin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function buildCsp(nonce: string, env: CspEnvironment): string {
  const supabase = origin(env.supabaseUrl);

  const directives: string[][] = [
    ["default-src", "'self'"],
    // 'self' is kept for browsers that predate 'strict-dynamic'; modern
    // ones ignore it when the nonce is present.
    [
      "script-src",
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(env.dev ? ["'unsafe-eval'"] : []),
    ],
    // Never add a nonce here: it would make browsers ignore
    // 'unsafe-inline', which is what allows the style attributes Recharts
    // and the view transitions write.
    ["style-src", "'self'", "'unsafe-inline'"],
    ["img-src", "'self'", "blob:", "data:"],
    ["font-src", "'self'"],
    [
      "connect-src",
      "'self'",
      ...(supabase ? [supabase] : []),
      ...(env.dev ? ["ws:"] : []),
      ...(env.preview ? ["https://vercel.live"] : []),
    ],
    ...(env.preview ? [["frame-src", "https://vercel.live"]] : []),
    ["worker-src", "'self'"],
    ["manifest-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
  ];

  return directives.map((d) => d.join(" ")).join("; ");
}
