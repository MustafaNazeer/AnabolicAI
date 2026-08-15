import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  listUsersMock,
  settingsMock,
  eqMock,
  sendToUserWithMock,
  createAdminClientMock,
} = vi.hoisted(() => {
  const listUsersMock = vi.fn();
  const settingsMock = vi.fn();
  const eqMock = vi.fn(() => ({ maybeSingle: settingsMock }));
  const sendToUserWithMock = vi.fn();
  const createAdminClientMock = vi.fn(() => ({
    auth: { admin: { listUsers: listUsersMock } },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: eqMock })),
    })),
  }));
  return {
    listUsersMock,
    settingsMock,
    eqMock,
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
});

describe("notifyAdminsOfSignup", () => {
  it("pushes to an admin whose notifications are on", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    listUsersMock.mockResolvedValue({
      data: { users: [{ id: "admin-1", email: "boss@b.com" }] },
    });
    settingsMock.mockResolvedValue({
      data: { notif_master: true, notif_new_account: true },
    });
    await notifyAdminsOfSignup("stranger@c.com");
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
    await notifyAdminsOfSignup("stranger@c.com");
    expect(sendToUserWithMock).not.toHaveBeenCalled();
  });

  // A signup must never fail because a notification could not be sent.
  it("swallows a push failure rather than throwing into the signup path", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    listUsersMock.mockRejectedValue(new Error("auth api down"));
    await expect(
      notifyAdminsOfSignup("stranger@c.com"),
    ).resolves.toBeUndefined();
  });

  // The swallow must not be silent. A logging call is what distinguishes a
  // systematically broken push path from nobody having signed up, matching
  // the markApproved precedent.
  it("logs the failure it swallows", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    listUsersMock.mockRejectedValue(new Error("auth api down"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await notifyAdminsOfSignup("stranger@c.com");
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
    await notifyAdminsOfSignup("stranger@c.com");
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
      notifyAdminsOfSignup("stranger@c.com"),
    ).resolves.toBeUndefined();
    expect(sendToUserWithMock).not.toHaveBeenCalled();
  });
});
