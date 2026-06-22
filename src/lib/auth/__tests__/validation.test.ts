import { describe, it, expect } from "vitest";
import { validateCredentials } from "@/lib/auth/validation";

describe("validateCredentials", () => {
  it("accepts a well-formed email and an 8+ character password", () => {
    expect(validateCredentials("a@b.com", "password1")).toBeNull();
  });
  it("rejects a malformed email", () => {
    expect(validateCredentials("not-an-email", "password1")).toMatch(/email/i);
  });
  it("rejects a short password", () => {
    expect(validateCredentials("a@b.com", "short")).toMatch(/8/);
  });
});
