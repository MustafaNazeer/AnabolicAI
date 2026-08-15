import { describe, it, expect, vi, beforeEach } from "vitest";

const { getVerifiedUserMock, createClientMock, upsertMock, revalidateMock } =
  vi.hoisted(() => {
    const upsertMock =
      vi.fn<
        (
          payload: Record<string, unknown>,
          options?: { onConflict: string },
        ) => Promise<{ error: { message: string } | null }>
      >();
    return {
      getVerifiedUserMock: vi.fn(),
      revalidateMock: vi.fn(),
      upsertMock,
      createClientMock: vi.fn(async () => ({
        from: vi.fn(() => ({ upsert: upsertMock })),
      })),
    };
  });

vi.mock("@/lib/auth/user", () => ({ getVerifiedUser: getVerifiedUserMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));

import { setAiVisible } from "@/lib/ai/visibility";

beforeEach(() => {
  vi.clearAllMocks();
  upsertMock.mockResolvedValue({ error: null });
  getVerifiedUserMock.mockResolvedValue({ id: "u1", email: "a@b.com" });
});

describe("setAiVisible", () => {
  it("writes the visibility flag", async () => {
    await expect(setAiVisible(false)).resolves.toEqual({ ok: true });
    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: "u1", ai_visible: false },
      { onConflict: "user_id" },
    );
  });

  // The three surfaces live on three different routes, and the switch is on a
  // fourth. Missing one leaves a hidden feature on screen until that page is
  // reloaded by hand.
  it("revalidates every route a surface renders on", async () => {
    await setAiVisible(false);
    const paths = revalidateMock.mock.calls.map(([p]) => p);
    expect(paths).toEqual(
      expect.arrayContaining(["/settings", "/", "/progress"]),
    );
  });

  // THE LOAD BEARING DIFFERENCE FROM THE THREE CONSENT ACTIONS. Those refuse an
  // unapproved account, because turning one on authorises spending money. This
  // spends nothing, and an unapproved account is precisely the one most likely
  // to want three features it cannot use out of its way. Gating it would also
  // be perverse: the lock notice it would show sits on the very rows this
  // switch exists to remove.
  it("does not consult approval, in either direction", async () => {
    await expect(setAiVisible(true)).resolves.toEqual({ ok: true });
    await expect(setAiVisible(false)).resolves.toEqual({ ok: true });
    expect(upsertMock).toHaveBeenCalledTimes(2);
  });

  it("refuses when signed out", async () => {
    getVerifiedUserMock.mockResolvedValue(null);
    await expect(setAiVisible(false)).resolves.toEqual({
      error: "Not signed in.",
    });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("returns the error when the write fails", async () => {
    upsertMock.mockResolvedValue({ error: { message: "permission denied" } });
    await expect(setAiVisible(false)).resolves.toEqual({
      error: "permission denied",
    });
  });
});
