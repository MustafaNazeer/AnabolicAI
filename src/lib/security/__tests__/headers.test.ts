import { describe, it, expect } from "vitest";
import { STATIC_SECURITY_HEADERS } from "@/lib/security/headers";

describe("STATIC_SECURITY_HEADERS", () => {
  it("carries exactly the five headers with their exact values", () => {
    expect(STATIC_SECURITY_HEADERS).toEqual([
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
    ]);
  });

  it("does not carry the CSP, which needs a per request nonce", () => {
    const keys = STATIC_SECURITY_HEADERS.map((h) => h.key.toLowerCase());
    expect(keys).not.toContain("content-security-policy");
  });
});
