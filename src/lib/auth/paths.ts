export const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/auth"] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
