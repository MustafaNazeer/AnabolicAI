import { describe, it, expect, vi, beforeEach } from "vitest";

const { claimMock, updateEqMock, updateMock, fromMock, createAdminClientMock } =
  vi.hoisted(() => {
    // The claim chain: .update({...}).eq(...).eq(...).select("user_id"). Every
    // .eq() call returns the same mock so an arbitrary number of filters
    // chains, and each terminates in either another .eq() or the .select()
    // that resolves the claim.
    const claimMock = vi.fn();
    const updateEqMock = vi.fn(() => ({ eq: updateEqMock, select: claimMock }));
    const updateMock = vi.fn(() => ({ eq: updateEqMock }));
    const fromMock = vi.fn(() => ({ update: updateMock }));
    const createAdminClientMock = vi.fn(() => ({ from: fromMock }));
    return { claimMock, updateEqMock, updateMock, fromMock, createAdminClientMock };
  });

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}));

import { claimSignupSeen } from "@/lib/accounts/seen";

beforeEach(() => {
  vi.clearAllMocks();
  createAdminClientMock.mockReturnValue({ from: fromMock });
  claimMock.mockResolvedValue({ data: [{ user_id: "u1" }] });
});

describe("claimSignupSeen", () => {
  // Both filters are the claim. Without the signup_seen filter the update
  // always matches and every landing reads as the first one, which is the
  // whole bug this marker exists to prevent.
  it("claims the marker with both filters and says the landing was the first", async () => {
    expect(await claimSignupSeen("u1")).toBe(true);
    expect(fromMock).toHaveBeenCalledWith("user_settings");
    expect(updateMock).toHaveBeenCalledWith({ signup_seen: true });
    expect(updateEqMock).toHaveBeenCalledWith("user_id", "u1");
    expect(updateEqMock).toHaveBeenCalledWith("signup_seen", false);
    expect(claimMock).toHaveBeenCalledWith("user_id");
  });

  // The second landing. The conditional update matches nothing, and the
  // caller must hear that rather than approving or announcing again.
  it("says a landing is not the first when the marker is already set", async () => {
    claimMock.mockResolvedValue({ data: [] });
    expect(await claimSignupSeen("u1")).toBe(false);
  });

  // A failed claim is not proof of a first landing. Reading a broken update as
  // a claim would re-approve an account the admin had just revoked, which is
  // the failure this whole marker is here to stop.
  it("says a landing is not the first when the claim could not be read", async () => {
    claimMock.mockResolvedValue({ data: null, error: new Error("boom") });
    expect(await claimSignupSeen("u1")).toBe(false);
  });

  // Runs on the signup paths, so it must never turn a successful signup into
  // an error page. createAdminClient throws synchronously when the service
  // role key is unset, and that is the shape most likely to reach production.
  it("never throws into the signup path when the admin client cannot be built", async () => {
    createAdminClientMock.mockImplementation(() => {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(claimSignupSeen("u1")).resolves.toBe(false);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
