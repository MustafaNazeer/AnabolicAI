import { describe, it, expect, vi, beforeEach } from "vitest";

const { updateMock, eqMock, fromMock } = vi.hoisted(() => {
  const eqMock = vi.fn(async () => ({ error: null }));
  const updateMock = vi.fn(() => ({ eq: eqMock }));
  return { updateMock, eqMock, fromMock: vi.fn(() => ({ update: updateMock })) };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: fromMock })),
}));

import { markApproved } from "@/lib/accounts/approve";

beforeEach(() => vi.clearAllMocks());

describe("markApproved", () => {
  it("sets approved on exactly the one account", async () => {
    await markApproved("user-1");
    expect(fromMock).toHaveBeenCalledWith("user_settings");
    expect(updateMock).toHaveBeenCalledWith({ approved: true });
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-1");
  });

  // A failed approval must not turn a successful signup into an error page.
  // createAdminClient throws synchronously when the service role key is
  // unset, and that throw has to be caught here, not just a PostgREST error
  // result. Logged rather than truly silent, so a systematically broken key
  // is distinguishable from an admin who simply has not approved anyone yet.
  it("resolves instead of throwing when the query rejects, and logs it", async () => {
    eqMock.mockRejectedValueOnce(new Error("network unreachable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(markApproved("user-1")).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
