import { describe, it, expect } from "vitest";
import { isAdminEmail, isOpenSignup, canUseAi } from "@/lib/accounts/approval";

describe("isAdminEmail", () => {
  it("admits an email on the list, ignoring case and spacing", () => {
    expect(isAdminEmail("A@B.com", " a@b.com , c@d.com")).toBe(true);
  });

  it("refuses an email that is not on the list", () => {
    expect(isAdminEmail("x@y.com", "a@b.com")).toBe(false);
  });

  // The load bearing case. A signed in user whose email claim is missing must
  // never be treated as an admin, and an unset variable must not make everyone
  // one.
  it("refuses a null email and refuses everyone when the list is unset", () => {
    expect(isAdminEmail(null, "a@b.com")).toBe(false);
    expect(isAdminEmail("a@b.com", undefined)).toBe(false);
    expect(isAdminEmail("a@b.com", "")).toBe(false);
  });
});

describe("isOpenSignup", () => {
  it("is open only for the exact string true", () => {
    expect(isOpenSignup("true")).toBe(true);
  });

  // Fail closed. A misspelled or half set variable leaves the app invite only,
  // which is the state it shipped in.
  it("is closed for anything else, including unset and truthy lookalikes", () => {
    for (const value of [undefined, "", "false", "TRUE", "1", "yes"]) {
      expect(isOpenSignup(value)).toBe(false);
    }
  });
});

describe("canUseAi", () => {
  it("allows an approved account", () => {
    expect(canUseAi({ approved: true })).toBe(true);
  });

  // A missing settings row is the shape a failed or empty read returns, and it
  // must read as not approved rather than as permission.
  it("refuses an unapproved account, a null row and an undefined row", () => {
    expect(canUseAi({ approved: false })).toBe(false);
    expect(canUseAi(null)).toBe(false);
    expect(canUseAi(undefined)).toBe(false);
  });
});
