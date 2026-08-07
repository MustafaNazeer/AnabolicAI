// The static header set, applied to every route by next.config.ts. The CSP
// is deliberately absent: it carries a per request nonce and is set by the
// proxy instead. This module is imported by next.config.ts, so it must
// stay free of any server-only or app dependency.
export const STATIC_SECURITY_HEADERS: { key: string; value: string }[] = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];
