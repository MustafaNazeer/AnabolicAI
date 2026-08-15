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
});
