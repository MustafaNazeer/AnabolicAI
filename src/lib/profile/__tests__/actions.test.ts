import { describe, it, expect, vi, beforeEach } from "vitest";

const { getVerifiedUserMock, updateMock, eqMock, fromMock } = vi.hoisted(() => {
  const eqMock = vi.fn(async () => ({ error: null }));
  const updateMock = vi.fn(() => ({ eq: eqMock }));
  return {
    getVerifiedUserMock: vi.fn(),
    updateMock,
    eqMock,
    fromMock: vi.fn(() => ({ update: updateMock })),
  };
});

vi.mock("@/lib/auth/user", () => ({ getVerifiedUser: getVerifiedUserMock }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: fromMock })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setDisplayName } from "@/lib/profile/actions";

beforeEach(() => {
  vi.clearAllMocks();
  getVerifiedUserMock.mockResolvedValue({ id: "u1", email: "her@example.com" });
});

describe("setDisplayName", () => {
  it("refuses when signed out", async () => {
    getVerifiedUserMock.mockResolvedValue(null);
    await expect(setDisplayName("Mustafa")).resolves.toEqual({
      error: "Not signed in.",
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("writes the trimmed name", async () => {
    await setDisplayName("  Mustafa  ");
    expect(updateMock).toHaveBeenCalledWith({ display_name: "Mustafa" });
  });

  // WRITES THE CALLER'S OWN ROW AND TAKES NO USER ID, so it cannot touch
  // another account rather than merely refusing to. Same shape as
  // setWeekPlanner, for the same reason: a server action is a public endpoint.
  it("scopes the write to the caller's own row", async () => {
    await setDisplayName("Mustafa");
    expect(eqMock).toHaveBeenCalledWith("user_id", "u1");
  });

  // Declining is a real answer and has to be storable, or the prompt asks
  // forever. An empty string is what "asked and declined" looks like in the
  // column, and it is deliberately NOT the same as never asked.
  it("stores a refusal as an empty string rather than refusing to write", async () => {
    await setDisplayName("");
    expect(updateMock).toHaveBeenCalledWith({ display_name: "" });
  });

  it("refuses a name the column could not hold", async () => {
    await expect(setDisplayName("m".repeat(41))).resolves.toEqual({
      error: "That name is too long.",
    });
    expect(fromMock).not.toHaveBeenCalled();
  });
});
