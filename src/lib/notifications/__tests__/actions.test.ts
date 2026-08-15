import { describe, it, expect, vi, beforeEach } from "vitest";

const { getVerifiedUserMock, createClientMock, upsertMock } = vi.hoisted(() => {
  // Declared with its signature rather than an implementation, so mock.calls
  // carries typed arguments. The point of this suite is what reaches the
  // payload, and an argument-less mock types every recorded call as an empty
  // tuple. beforeEach supplies the resolved value.
  const upsertMock =
    vi.fn<
      (
        payload: Record<string, unknown>,
        options?: { onConflict: string },
      ) => Promise<{ error: { message: string } | null }>
    >();
  const fromMock = vi.fn(() => ({ upsert: upsertMock }));
  return {
    getVerifiedUserMock: vi.fn(),
    createClientMock: vi.fn(async () => ({ from: fromMock })),
    upsertMock,
  };
});

vi.mock("@/lib/auth/user", () => ({ getVerifiedUser: getVerifiedUserMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateNotificationSettings } from "@/lib/notifications/actions";

const values = {
  notif_master: true,
  notif_rest_timer: true,
  notif_rest_push: false,
  notif_reminder: true,
  reminder_days: "Mon,Wed",
  reminder_time: "18:00",
  notif_streak: true,
  notif_pr: true,
  notif_weekly: false,
  notif_goal: true,
  notif_unfinished: false,
  rest_timer_seconds: 90,
};

beforeEach(() => {
  vi.clearAllMocks();
  upsertMock.mockResolvedValue({ error: null });
  getVerifiedUserMock.mockResolvedValue({ id: "u1", email: "a@b.com" });
});

describe("updateNotificationSettings", () => {
  it("writes the settings it was given", async () => {
    await expect(updateNotificationSettings(values)).resolves.toEqual({
      ok: true,
    });
    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: "u1", ...values },
      { onConflict: "user_id" },
    );
  });

  // This is a server action, so its argument arrives over the wire and the
  // TypeScript shape is erased before it runs. Spreading whatever arrived put
  // every column of user_settings within reach of a crafted call. The database
  // refuses approved and signup_seen through a column level revoke, but the
  // application should not be sending them in the first place, and the revoke
  // covers only the two columns anyone thought to name.
  it("ignores a key it was not asked to write", async () => {
    await updateNotificationSettings({
      ...values,
      approved: true,
      signup_seen: false,
    } as unknown as typeof values);

    const [payload] = upsertMock.mock.calls[0];
    expect(payload).not.toHaveProperty("approved");
    expect(payload).not.toHaveProperty("signup_seen");
    expect(payload).toEqual({ user_id: "u1", ...values });
  });

  it("refuses when signed out", async () => {
    getVerifiedUserMock.mockResolvedValue(null);
    await expect(updateNotificationSettings(values)).resolves.toEqual({
      error: "Not signed in.",
    });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("returns the error when the write fails", async () => {
    upsertMock.mockResolvedValue({ error: { message: "permission denied" } });
    await expect(updateNotificationSettings(values)).resolves.toEqual({
      error: "permission denied",
    });
  });
});
