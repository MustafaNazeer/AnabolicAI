import { describe, it, expect } from "vitest";
import { SET_COLUMNS, SESSION_COLUMNS, selectColumns, type SetRow } from "@/lib/export/columns";
import { estimatedOneRepMax, setVolume } from "@/lib/progress/strength";

const TZ = "America/Chicago";

const ROW: SetRow = {
  date: "2026-08-12T02:30:00.000Z",
  routineName: "Push Day",
  exerciseName: "Bench Press",
  setNumber: 2,
  reps: 5,
  weight: 185,
  rirLow: 1,
  rirHigh: 2,
};

function valueOf(key: string, row: SetRow, tz = TZ): string {
  const column = SET_COLUMNS.find((c) => c.key === key);
  if (!column) throw new Error(`no such column: ${key}`);
  return column.value(row, tz);
}

describe("set columns", () => {
  // 02:30 UTC is the previous evening in Chicago. A set logged late at night
  // has to land on the day it was trained, not the next UTC day.
  it("renders the date in the caller's timezone", () => {
    expect(valueOf("date", ROW)).toBe("2026-08-11");
  });

  it("renders the plain fields", () => {
    expect(valueOf("routine", ROW)).toBe("Push Day");
    expect(valueOf("exercise", ROW)).toBe("Bench Press");
    expect(valueOf("setNumber", ROW)).toBe("2");
    expect(valueOf("reps", ROW)).toBe("5");
    expect(valueOf("weight", ROW)).toBe("185");
  });

  it("renders a RIR range as low to high", () => {
    expect(valueOf("rir", ROW)).toBe("1-2");
  });

  it("renders a single RIR as one number", () => {
    expect(valueOf("rir", { ...ROW, rirLow: 2, rirHigh: 2 })).toBe("2");
  });

  // SPEC.md section 4: leaving RIR blank records no RIR at all. A zero here
  // would be a fabricated data point in a file destined for analysis.
  it("leaves RIR empty when it was not recorded", () => {
    expect(valueOf("rir", { ...ROW, rirLow: null, rirHigh: null })).toBe("");
  });

  // Derived columns must agree with the app rather than with a copied number.
  it("derives the estimated one rep max from the real helper", () => {
    expect(valueOf("e1rm", ROW)).toBe(String(estimatedOneRepMax(185, 5)));
  });

  it("derives volume from the real helper", () => {
    expect(valueOf("volume", ROW)).toBe(String(setVolume(185, 5)));
  });
});

describe("selectColumns", () => {
  it("returns the chosen columns in catalogue order, not tick order", () => {
    const result = selectColumns("sets", ["weight", "date", "reps"]);
    if (!result.ok) throw new Error("expected ok");
    expect(result.columns.map((c) => c.key)).toEqual(["date", "reps", "weight"]);
  });

  it("rejects a key that is not in the catalogue", () => {
    const result = selectColumns("sets", ["date", "user_id"]);
    expect(result).toEqual({ ok: false, error: "Unknown column: user_id" });
  });

  // A key valid for the other dataset is still invalid here. This is the case
  // a naive "is it a known key anywhere" check would wave through.
  it("rejects a key belonging to the other dataset", () => {
    const result = selectColumns("sessions", ["date", "exercise"]);
    expect(result).toEqual({ ok: false, error: "Unknown column: exercise" });
  });

  it("rejects an empty selection", () => {
    expect(selectColumns("sets", [])).toEqual({
      ok: false,
      error: "Choose at least one column.",
    });
  });
});

describe("session columns", () => {
  it("exposes exactly the four session columns", () => {
    expect(SESSION_COLUMNS.map((c) => c.key)).toEqual([
      "date",
      "routine",
      "totalSets",
      "totalVolume",
    ]);
  });
});
