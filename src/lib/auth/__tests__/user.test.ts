import { describe, it, expect, vi, beforeEach } from "vitest";

const { getClaimsMock, redirectMock } = vi.hoisted(() => ({
  getClaimsMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims: getClaimsMock } })),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import { getVerifiedUser, requireUser } from "@/lib/auth/user";

const CLAIMS = {
  data: { claims: { sub: "u1", email: "a@b.com" }, header: {}, signature: [] },
  error: null,
};

beforeEach(() => {
  getClaimsMock.mockReset().mockResolvedValue(CLAIMS);
  redirectMock.mockClear();
});

describe("getVerifiedUser", () => {
  it("maps sub to id and email to email", async () => {
    expect(await getVerifiedUser()).toEqual({ id: "u1", email: "a@b.com" });
  });

  // The email claim is optional in the payload type, so a token without one
  // must still yield a usable identity rather than undefined.
  it("returns a null email when the claim is absent", async () => {
    getClaimsMock.mockResolvedValue({
      data: { claims: { sub: "u1" }, header: {}, signature: [] },
      error: null,
    });
    expect(await getVerifiedUser()).toEqual({ id: "u1", email: null });
  });

  it("returns null when verification errors", async () => {
    getClaimsMock.mockResolvedValue({ data: null, error: new Error("bad jwt") });
    expect(await getVerifiedUser()).toBeNull();
  });

  // data is null with no error when there is simply no session.
  it("returns null when there is no session", async () => {
    getClaimsMock.mockResolvedValue({ data: null, error: null });
    expect(await getVerifiedUser()).toBeNull();
  });
});

describe("requireUser", () => {
  it("returns the user when verified", async () => {
    expect(await requireUser()).toEqual({ id: "u1", email: "a@b.com" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  // requireUser and getVerifiedUser are pinned separately on purpose:
  // collapsing them into one export is the likely future mistake, and it
  // would silently turn a returned error into a redirect at 12 call sites.
  it("redirects to sign in when there is no verified user", async () => {
    getClaimsMock.mockResolvedValue({ data: null, error: null });
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT:/sign-in");
    expect(redirectMock).toHaveBeenCalledWith("/sign-in");
  });
});
