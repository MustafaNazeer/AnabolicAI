import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// selectMock stays inside the factory rather than being returned. The upsert
// chain needs it; no assertion does, and an unused binding is a lint warning in
// a project that holds eslint at zero of them.
const { getVerifiedUserMock, upsertMock, fromMock, deleteMock, deleteEqMock, insertMock } = vi.hoisted(
  () => {
    const single = vi.fn(async () => ({ data: { id: "day-1" }, error: null }));
    const selectMock = vi.fn(() => ({ single }));
    const upsertMock = vi.fn(() => ({ select: selectMock }));
    // The eq is shared rather than fresh per call, so a test can assert what a
    // delete was actually keyed on rather than only that one happened.
    const deleteEqMock = vi.fn(async () => ({ error: null }));
    const deleteMock = vi.fn(() => ({ eq: deleteEqMock }));
    const insertMock = vi.fn(async () => ({ error: null }));
    return {
      getVerifiedUserMock: vi.fn(),
      upsertMock,
      deleteMock,
      deleteEqMock,
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
const { revalidateMock } = vi.hoisted(() => ({ revalidateMock: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));

import { savePlannerDay, clearPlannerDay } from "@/lib/planner/dayActions";

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
  afterEach(() => {
    vi.useRealTimers();
  });

  // vi.setSystemTime, NOT an assignment to Date.now, and that difference is the
  // reason this entire block was inert.
  //
  // savePlannerDay reads the clock with `new Date()`, which goes straight to the
  // system clock and never consults Date.now, so overriding Date.now alone froze
  // nothing. Every case below was really comparing its hardcoded day against the
  // REAL date, and three of them passed only because that day happened to fall
  // on the right side of it. The boundary case started failing the moment the
  // real date reached the 17th, and CI had gone green eighteen minutes earlier.
  //
  // toFake is narrowed to Date deliberately. Faking the timers as well would
  // stop the awaited supabase mocks settling without a manual tick, which is a
  // second problem this block does not have and does not need.
  //
  // 2026-08-16 17:00Z is 12:00 in Chicago on the 16th.
  function freezeAt(iso: string) {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(iso));
  }

  // Pins the MECHANISM rather than a behaviour, because the mechanism is what
  // failed. Every other assertion here is worthless if the freeze does not reach
  // `new Date()`, and nothing said so: the block just quietly read the wall
  // clock for two days until a date rolled over and one expectation stopped
  // matching by luck.
  it("freezes the clock the action actually reads, not only Date.now", () => {
    freezeAt("2026-08-17T02:00:00Z");
    expect(new Date().toISOString()).toBe("2026-08-17T02:00:00.000Z");
    expect(Date.now()).toBe(new Date("2026-08-17T02:00:00Z").getTime());
  });

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

// Undoing a day removes its row rather than saving it empty. An empty row is
// still a day that happened: it would keep its square on the strip and keep
// counting toward the streak of days with an entry. Only a delete makes the
// day read as though it was never logged.
describe("clearPlannerDay", () => {
  it("refuses when signed out", async () => {
    getVerifiedUserMock.mockResolvedValue(null);
    await expect(clearPlannerDay("2026-08-11")).resolves.toEqual({
      error: "Not signed in.",
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("deletes the day's own row", async () => {
    await clearPlannerDay("2026-08-11");
    expect(fromMock).toHaveBeenCalledWith("planner_days");
    expect(deleteMock).toHaveBeenCalled();
    expect(deleteEqMock).toHaveBeenCalledWith("day", "2026-08-11");
  });

  // The labels are never deleted here and that is deliberate:
  // planner_day_categories cascades off the day, so removing the day takes its
  // labels with it in one statement. Deleting them separately would be a second
  // round trip that can half fail.
  it("leaves the labels to cascade rather than deleting them itself", async () => {
    await clearPlannerDay("2026-08-11");
    expect(fromMock).not.toHaveBeenCalledWith("planner_day_categories");
  });

  // THE BALANCE HAS TO MOVE TOO. Its counts are derived from the same rows the
  // strip draws, so the page has to be revalidated or the chips would keep
  // counting a day that no longer exists until something else refreshed them.
  it("revalidates the dashboard so the week and the balance both drop it", async () => {
    await clearPlannerDay("2026-08-11");
    expect(revalidateMock).toHaveBeenCalledWith("/");
  });
});
