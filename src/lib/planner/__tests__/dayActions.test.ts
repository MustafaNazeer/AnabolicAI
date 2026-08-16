import { describe, it, expect, vi, beforeEach } from "vitest";

// selectMock stays inside the factory rather than being returned. The upsert
// chain needs it; no assertion does, and an unused binding is a lint warning in
// a project that holds eslint at zero of them.
const { getVerifiedUserMock, upsertMock, fromMock, deleteMock, insertMock } = vi.hoisted(
  () => {
    const single = vi.fn(async () => ({ data: { id: "day-1" }, error: null }));
    const selectMock = vi.fn(() => ({ single }));
    const upsertMock = vi.fn(() => ({ select: selectMock }));
    const deleteMock = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
    const insertMock = vi.fn(async () => ({ error: null }));
    return {
      getVerifiedUserMock: vi.fn(),
      upsertMock,
      deleteMock,
      insertMock,
      fromMock: vi.fn(() => ({
        upsert: upsertMock,
        delete: deleteMock,
        insert: insertMock,
      })),
    };
  });

vi.mock("@/lib/auth/user", () => ({ getVerifiedUser: getVerifiedUserMock }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: fromMock })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { savePlannerDay } from "@/lib/planner/dayActions";

beforeEach(() => {
  vi.clearAllMocks();
  getVerifiedUserMock.mockResolvedValue({ id: "u1", email: "her@example.com" });
});

describe("savePlannerDay", () => {
  it("refuses when signed out", async () => {
    getVerifiedUserMock.mockResolvedValue(null);
    await expect(savePlannerDay("2026-08-11", ["c1"], true)).resolves.toEqual({
      error: "Not signed in.",
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  // Replacing the plan is the behaviour she chose, and at this layer that means
  // the day's labels are set to exactly what was passed rather than added to.
  // Without the delete, changing a day from cardio to arms would leave both.
  it("clears the day's existing labels before writing the new ones", async () => {
    await savePlannerDay("2026-08-11", ["c2"], true);
    expect(deleteMock).toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalledWith([{ day_id: "day-1", category_id: "c2" }]);
  });

  it("upserts on the day so a second save is not a second day", async () => {
    await savePlannerDay("2026-08-11", ["c2"], true);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", day: "2026-08-11", done: true }),
      { onConflict: "user_id,day" },
    );
  });

  it("writes a planned day as not done", async () => {
    await savePlannerDay("2026-08-20", ["c1"], false);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ done: false }),
      { onConflict: "user_id,day" },
    );
  });

  // Clearing every label off a day is how she takes a day back, and it must not
  // become an insert of an empty array. PostgREST answers that with a 400, so
  // the day would keep the labels the delete just removed on the next read and
  // the save would report a failure it did not really have.
  it("writes no labels at all when every one is cleared", async () => {
    await savePlannerDay("2026-08-11", [], true);
    expect(deleteMock).toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });
});
