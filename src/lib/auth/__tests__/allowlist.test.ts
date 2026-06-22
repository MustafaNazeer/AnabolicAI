import { describe, it, expect } from "vitest";
import { isEmailAllowed } from "@/lib/auth/allowlist";

describe("isEmailAllowed", () => {
  it("allows an email on the list, case and space insensitive", () => {
    expect(isEmailAllowed("Me@Example.com ", "me@example.com, friend@x.io")).toBe(true);
  });
  it("rejects an email not on the list", () => {
    expect(isEmailAllowed("stranger@x.io", "me@example.com")).toBe(false);
  });
  it("fails closed when the list is empty or undefined", () => {
    expect(isEmailAllowed("me@example.com", "")).toBe(false);
    expect(isEmailAllowed("me@example.com", undefined)).toBe(false);
  });
});
