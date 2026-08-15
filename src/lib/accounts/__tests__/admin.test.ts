import { describe, it, expect, vi, beforeEach } from "vitest";

const { listUsersMock, selectMock, fromMock } = vi.hoisted(() => {
  const listUsersMock = vi.fn();
  const selectMock = vi.fn();
  const fromMock = vi.fn(() => ({ select: selectMock }));
  return { listUsersMock, selectMock, fromMock };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: { admin: { listUsers: listUsersMock } },
    from: fromMock,
  })),
}));

import { listAccounts } from "@/lib/accounts/admin";

beforeEach(() => {
  vi.clearAllMocks();
  listUsersMock.mockResolvedValue({
    data: { users: [], aud: "authenticated" },
    error: null,
  });
  selectMock.mockResolvedValue({ data: [], error: null });
});

describe("listAccounts", () => {
  // A failed listUsers read must never quietly render as an empty product: it
  // throws, names the read that failed, and never goes on to read
  // user_settings for a list it does not have.
  it("throws naming the listUsers read when it fails, and reads no further", async () => {
    listUsersMock.mockResolvedValue({
      data: { users: [], aud: "authenticated" },
      error: { message: "service unavailable" },
    });
    await expect(listAccounts()).rejects.toThrow(
      "listAccounts: failed to list users: service unavailable",
    );
    expect(fromMock).not.toHaveBeenCalled();
  });

  // A failed user_settings read must never quietly render as every account
  // waiting for approval: it throws instead of falling back to an empty
  // approval map.
  it("throws naming the user_settings read when it fails", async () => {
    selectMock.mockResolvedValue({
      data: null,
      error: { message: "connection refused" },
    });
    await expect(listAccounts()).rejects.toThrow(
      "listAccounts: failed to read user_settings: connection refused",
    );
  });
});
