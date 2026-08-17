import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
    await expect(savePlannerDay("2026-08-11", ["c1"])).resolves.toEqual({
      error: "Not signed in.",
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  // Replacing the plan is the behaviour she chose, and at this layer that means
  // the day's labels are set to exactly what was passed rather than added to.
  // Without the delete, changing a day from cardio to arms would leave both.
  it("clears the day's existing labels before writing the new ones", async () => {
    await savePlannerDay("2026-08-11", ["c2"]);
    expect(deleteMock).toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalledWith([{ day_id: "day-1", category_id: "c2" }]);
  });

  it("upserts on the day so a second save is not a second day", async () => {
    await savePlannerDay("2026-08-11", ["c2"]);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", day: "2026-08-11", done: true }),
      { onConflict: "user_id,day" },
    );
  });

  // REMOVED 2026-08-16, deliberately, rather than updated. It asserted that
  // 2026-08-20 writes as not done, which was a statement about an argument when
  // done was passed in and became a statement about the wall clock when done
  // was derived. It would have passed every run until 2026-08-20 and failed
  // silently from then on. The block at the bottom of this file makes the same
  // assertion against a frozen clock, in both directions.

  // Clearing every label off a day is how she takes a day back, and it must not
  // become an insert of an empty array. PostgREST answers that with a 400, so
  // the day would keep the labels the delete just removed on the next read and
  // the save would report a failure it did not really have.
  it("writes no labels at all when every one is cleared", async () => {
    await savePlannerDay("2026-08-11", []);
    expect(deleteMock).toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });
});

// The second button is gone, so the DATE decides what a save means: a day that
// has arrived is a workout, a day still to come is a plan. Derived on the
// server rather than passed in, so the caller cannot claim a future day was
// trained, and so there is one definition of "has it happened" rather than one
// per surface.
describe("savePlannerDay, done derived from the date", () => {
  const REAL_NOW = Date.now;
  afterEach(() => {
    Date.now = REAL_NOW;
  });

  // 2026-08-16 17:00Z is 12:00 in Chicago on the 16th.
  function freezeAt(iso: string) {
    const fixed = new Date(iso).getTime();
    Date.now = () => fixed;
  }

  it("writes today as done", async () => {
    freezeAt("2026-08-16T17:00:00Z");
    await savePlannerDay("2026-08-16", ["c1"]);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ day: "2026-08-16", done: true }),
      { onConflict: "user_id,day" },
    );
  });

  it("writes a day already gone as done", async () => {
    freezeAt("2026-08-16T17:00:00Z");
    await savePlannerDay("2026-08-14", ["c1"]);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ done: true }),
      { onConflict: "user_id,day" },
    );
  });

  // THE ASSERTION THE BALANCE RESTS ON. A day after today has not happened, so
  // it is a plan however it was saved, and the weekly counts still exclude it.
  it("writes a day still to come as not done", async () => {
    freezeAt("2026-08-16T17:00:00Z");
    await savePlannerDay("2026-08-20", ["c1"]);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ done: false }),
      { onConflict: "user_id,day" },
    );
  });

  // The boundary is the app's own timezone, not UTC. At 02:00Z on the 17th it
  // is still the 16th in Chicago, so the 17th has not arrived and must not be
  // recorded as trained.
  it("decides the boundary in the app timezone rather than in UTC", async () => {
    freezeAt("2026-08-17T02:00:00Z");
    await savePlannerDay("2026-08-17", ["c1"]);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ done: false }),
      { onConflict: "user_id,day" },
    );
  });
});
