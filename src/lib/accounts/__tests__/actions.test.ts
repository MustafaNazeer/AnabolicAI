import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  getVerifiedUserMock,
  createAdminClientMock,
  fromMock,
  updateMock,
  eqMock,
} = vi.hoisted(() => {
  const eqMock = vi.fn(
    async (): Promise<{ error: { message: string } | null }> => ({
      error: null,
    }),
  );
  const updateMock = vi.fn(() => ({ eq: eqMock }));
  const fromMock = vi.fn(() => ({ update: updateMock }));
  return {
    getVerifiedUserMock: vi.fn(),
    createAdminClientMock: vi.fn(() => ({ from: fromMock })),
    fromMock,
    updateMock,
    eqMock,
  };
});

vi.mock("@/lib/auth/user", () => ({ getVerifiedUser: getVerifiedUserMock }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { approveAccount, revokeAccount } from "@/lib/accounts/actions";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  eqMock.mockResolvedValue({ error: null });
});

describe("approveAccount", () => {
  it("refuses approveAccount when the caller is not an admin", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    getVerifiedUserMock.mockResolvedValue({ id: "u9", email: "stranger@c.com" });
    await expect(approveAccount("u1")).resolves.toEqual({ error: "Not allowed." });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("refuses approveAccount when signed out", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    getVerifiedUserMock.mockResolvedValue(null);
    await expect(approveAccount("u1")).resolves.toEqual({ error: "Not allowed." });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("approves when the caller is an admin", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    getVerifiedUserMock.mockResolvedValue({ id: "u9", email: "boss@b.com" });
    await expect(approveAccount("u1")).resolves.toEqual({ ok: true });
    expect(fromMock).toHaveBeenCalledWith("user_settings");
    expect(updateMock).toHaveBeenCalledWith({ approved: true });
    expect(eqMock).toHaveBeenCalledWith("user_id", "u1");
  });
});

describe("revokeAccount", () => {
  it("refuses revokeAccount when the caller is not an admin", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    getVerifiedUserMock.mockResolvedValue({ id: "u9", email: "stranger@c.com" });
    await expect(revokeAccount("u1")).resolves.toEqual({ error: "Not allowed." });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("revokes when the caller is an admin", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    getVerifiedUserMock.mockResolvedValue({ id: "u9", email: "boss@b.com" });
    await expect(revokeAccount("u1")).resolves.toEqual({ ok: true });
    expect(updateMock).toHaveBeenCalledWith({ approved: false });
    expect(eqMock).toHaveBeenCalledWith("user_id", "u1");
  });

  it("surfaces the database error instead of claiming success", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    getVerifiedUserMock.mockResolvedValue({ id: "u9", email: "boss@b.com" });
    eqMock.mockResolvedValueOnce({ error: { message: "connection refused" } });
    await expect(revokeAccount("u1")).resolves.toEqual({
      error: "connection refused",
    });
  });
});
