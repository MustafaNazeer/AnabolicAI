import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  listUsersMock,
  claimMock,
  updateEqMock,
  updateMock,
  settingsMock,
  eqMock,
  fromMock,
  sendToUserWithMock,
  createAdminClientMock,
} = vi.hoisted(() => {
  const listUsersMock = vi.fn();

  // The claim chain: .update({...}).eq(...).eq(...).select("user_id"). Every
  // .eq() call is the same mock so an arbitrary number of filters chains
  // correctly, and each terminates in either another .eq() or the .select()
  // that resolves the claim.
  const claimMock = vi.fn();
  const updateEqMock = vi.fn(() => ({ eq: updateEqMock, select: claimMock }));
  const updateMock = vi.fn(() => ({ eq: updateEqMock }));

  // The settings read chain: .select(...).eq(...).maybeSingle().
  const settingsMock = vi.fn();
  const eqMock = vi.fn(() => ({ maybeSingle: settingsMock }));

  const fromMock = vi.fn(() => ({
    update: updateMock,
    select: vi.fn(() => ({ eq: eqMock })),
  }));

  const sendToUserWithMock = vi.fn();
  const createAdminClientMock = vi.fn(() => ({
    auth: { admin: { listUsers: listUsersMock } },
    from: fromMock,
  }));
  return {
    listUsersMock,
    claimMock,
    updateEqMock,
    updateMock,
    settingsMock,
    eqMock,
    fromMock,
    sendToUserWithMock,
    createAdminClientMock,
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}));
vi.mock("@/lib/notifications/push", () => ({
  sendToUserWith: sendToUserWithMock,
}));

import { notifyAdminsOfSignup } from "@/lib/accounts/notify";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  // A fresh claim succeeds by default; individual tests override this to
  // simulate the marker already being set.
  claimMock.mockResolvedValue({ data: [{ user_id: "new-user-1" }] });
});

describe("notifyAdminsOfSignup", () => {
  it("claims the marker before doing anything else, then pushes to an admin whose notifications are on", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    listUsersMock.mockResolvedValue({
      data: { users: [{ id: "admin-1", email: "boss@b.com" }] },
    });
    settingsMock.mockResolvedValue({
      data: { notif_master: true, notif_new_account: true },
    });
    await notifyAdminsOfSignup("new-user-1", "stranger@c.com");

    expect(fromMock).toHaveBeenCalledWith("user_settings");
    expect(updateMock).toHaveBeenCalledWith({ signup_seen: true });
    expect(updateEqMock).toHaveBeenCalledWith("user_id", "new-user-1");
    expect(updateEqMock).toHaveBeenCalledWith("signup_seen", false);
    expect(claimMock).toHaveBeenCalledWith("user_id");

    expect(sendToUserWithMock).toHaveBeenCalledWith(
      expect.anything(),
      "admin-1",
      expect.objectContaining({ url: "/settings/accounts" }),
    );
    // The filter is what makes the settings read mean anything: a wrong
    // value would read another account's preference.
    expect(eqMock).toHaveBeenCalledWith("user_id", "admin-1");
  });

  it("sends nothing when the admin has the master switch off", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    listUsersMock.mockResolvedValue({
      data: { users: [{ id: "admin-1", email: "boss@b.com" }] },
    });
    settingsMock.mockResolvedValue({
      data: { notif_master: false, notif_new_account: true },
    });
    await notifyAdminsOfSignup("new-user-1", "stranger@c.com");
    expect(sendToUserWithMock).not.toHaveBeenCalled();
  });

  // A signup must never fail because a notification could not be sent.
  it("swallows a push failure rather than throwing into the signup path", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    listUsersMock.mockRejectedValue(new Error("auth api down"));
    await expect(
      notifyAdminsOfSignup("new-user-1", "stranger@c.com"),
    ).resolves.toBeUndefined();
  });

  // The swallow must not be silent. A logging call is what distinguishes a
  // systematically broken push path from nobody having signed up, matching
  // the markApproved precedent.
  it("logs the failure it swallows", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    listUsersMock.mockRejectedValue(new Error("auth api down"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await notifyAdminsOfSignup("new-user-1", "stranger@c.com");
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  // Only the admin roster gets notified. A signed up stranger who is not on
  // ADMIN_EMAILS must never receive a push naming another signup.
  it("never notifies a non admin account", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    listUsersMock.mockResolvedValue({
      data: {
        users: [
          { id: "admin-1", email: "boss@b.com" },
          { id: "regular-1", email: "regular@c.com" },
        ],
      },
    });
    settingsMock.mockResolvedValue({
      data: { notif_master: true, notif_new_account: true },
    });
    await notifyAdminsOfSignup("new-user-1", "stranger@c.com");
    expect(sendToUserWithMock).toHaveBeenCalledTimes(1);
    expect(sendToUserWithMock).toHaveBeenCalledWith(
      expect.anything(),
      "admin-1",
      expect.anything(),
    );
  });

  // A missing settings row must read as no permission to send, matching the
  // rest of the notification gates, rather than crashing shouldSendNewAccount
  // on an undefined settings object.
  it("skips an admin with no settings row", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    listUsersMock.mockResolvedValue({
      data: { users: [{ id: "admin-1", email: "boss@b.com" }] },
    });
    settingsMock.mockResolvedValue({ data: null });
    await expect(
      notifyAdminsOfSignup("new-user-1", "stranger@c.com"),
    ).resolves.toBeUndefined();
    expect(sendToUserWithMock).not.toHaveBeenCalled();
  });

  // THE PROPERTY under review: a repeat login by a still pending account must
  // not retrigger the notification. The second call's claim finds the marker
  // already set (no row comes back) and must send nothing.
  it("sends nothing on a second call for the same still pending account", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    claimMock
      .mockResolvedValueOnce({ data: [{ user_id: "new-user-1" }] })
      .mockResolvedValueOnce({ data: [] });
    listUsersMock.mockResolvedValue({
      data: { users: [{ id: "admin-1", email: "boss@b.com" }] },
    });
    settingsMock.mockResolvedValue({
      data: { notif_master: true, notif_new_account: true },
    });

    await notifyAdminsOfSignup("new-user-1", "stranger@c.com");
    await notifyAdminsOfSignup("new-user-1", "stranger@c.com");

    expect(sendToUserWithMock).toHaveBeenCalledTimes(1);
  });

  // The claim is attempted before any push is sent, and before the admin
  // roster is even looked up: when it finds the marker already set, nothing
  // downstream of it runs at all.
  it("never looks up admins or pushes when the claim finds the account has landed before", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    claimMock.mockResolvedValue({ data: [] });
    listUsersMock.mockResolvedValue({
      data: { users: [{ id: "admin-1", email: "boss@b.com" }] },
    });
    settingsMock.mockResolvedValue({
      data: { notif_master: true, notif_new_account: true },
    });

    await notifyAdminsOfSignup("new-user-1", "stranger@c.com");

    expect(listUsersMock).not.toHaveBeenCalled();
    expect(sendToUserWithMock).not.toHaveBeenCalled();
  });
});
