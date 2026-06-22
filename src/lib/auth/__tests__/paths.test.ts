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

  it("treats the app tabs as protected", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/routines")).toBe(false);
    expect(isPublicPath("/settings")).toBe(false);
  });
});
