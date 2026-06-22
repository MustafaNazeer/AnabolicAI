// "/api/cron" routes authenticate themselves with a bearer secret, so the
// session middleware must not redirect them to sign-in.
export const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/auth", "/api/cron"] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
