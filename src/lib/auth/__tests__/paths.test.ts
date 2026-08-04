import { describe, it, expect } from "vitest";
import { isPublicPath } from "@/lib/auth/paths";

describe("isPublicPath", () => {
  it("treats the auth pages and confirm route as public", () => {
    expect(isPublicPath("/sign-in")).toBe(true);
    expect(isPublicPath("/sign-up")).toBe(true);
    expect(isPublicPath("/auth/confirm")).toBe(true);
  });

  it("treats the bearer-authenticated cron route as public to the session middleware", () => {
    expect(isPublicPath("/api/cron/daily")).toBe(true);
  });

  // The scheduler calls this with a signature and no session cookie. Without
  // this the middleware answers its callback with a 307 to /sign-in, the
  // handler never runs, and the notification silently never arrives. Verified
  // against production before the fix: an unsigned POST returned 307, not 401.
  it("treats the signature-authenticated rest callback as public", () => {
    expect(isPublicPath("/api/rest/complete")).toBe(true);
  });

  it("treats the app tabs as protected", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/routines")).toBe(false);
    expect(isPublicPath("/settings")).toBe(false);
  });
});
