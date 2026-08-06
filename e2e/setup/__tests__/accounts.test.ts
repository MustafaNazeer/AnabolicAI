import { describe, it, expect } from "vitest";
import { resolveE2eAccount } from "../accounts";

const GOOD = {
  E2E_EMAIL_CHROMIUM: "e2e-chromium@example.com",
  E2E_EMAIL_WEBKIT: "e2e-webkit@example.com",
  E2E_PASSWORD: "correct horse",
  DEMO_EMAIL: "demo@example.com",
};

describe("resolveE2eAccount", () => {
  it("returns the address for the project asked for", () => {
    expect(resolveE2eAccount(GOOD, "chromium")).toEqual({
      email: "e2e-chromium@example.com",
      password: "correct horse",
    });
    expect(resolveE2eAccount(GOOD, "webkit").email).toBe("e2e-webkit@example.com");
  });

  it("refuses a missing address, naming the variable", () => {
    expect(() => resolveE2eAccount({ ...GOOD, E2E_EMAIL_WEBKIT: "" }, "webkit")).toThrow(
      /E2E_EMAIL_WEBKIT/,
    );
  });

  it("refuses a missing password", () => {
    expect(() =>
      resolveE2eAccount({ ...GOOD, E2E_PASSWORD: undefined }, "chromium"),
    ).toThrow(/E2E_PASSWORD/);
  });

  // The reset wipes four tables for the account it is given, and the demo is
  // the account a recruiter clicks.
  it("refuses the demo account, whatever its casing", () => {
    expect(() =>
      resolveE2eAccount({ ...GOOD, E2E_EMAIL_CHROMIUM: "DEMO@example.com" }, "chromium"),
    ).toThrow(/demo/i);
  });

  // Two projects sharing one account reintroduces exactly the collision the
  // separate accounts exist to prevent, and it would fail confusingly later.
  it("refuses the two projects sharing one address", () => {
    expect(() =>
      resolveE2eAccount({ ...GOOD, E2E_EMAIL_WEBKIT: "e2e-chromium@example.com" }, "webkit"),
    ).toThrow(/E2E_EMAIL_CHROMIUM/);
  });

  it("tolerates DEMO_EMAIL being unset", () => {
    expect(() =>
      resolveE2eAccount({ ...GOOD, DEMO_EMAIL: undefined }, "chromium"),
    ).not.toThrow();
  });

  it("trims surrounding whitespace before comparing", () => {
    expect(() =>
      resolveE2eAccount({ ...GOOD, E2E_EMAIL_CHROMIUM: " demo@example.com " }, "chromium"),
    ).toThrow(/demo/i);
  });
});
