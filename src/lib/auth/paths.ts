// "/api/cron" routes authenticate themselves with a bearer secret, and
// "/api/rest" authenticates itself with a scheduler signature, so the session
// middleware must not redirect either to sign-in. Both are called by machines
// that carry no session cookie; a redirect means the handler never runs.
export const PUBLIC_PATHS = [
  "/sign-in",
  "/sign-up",
  "/auth",
  "/api/cron",
  "/api/rest",
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
