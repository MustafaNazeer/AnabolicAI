import { describe, it, expect } from "vitest";
import { plateauStatus, type PlateauPoint } from "@/lib/progress/plateau";

const TODAY = new Date("2026-08-12T12:00:00Z");

// Sessions every 4 days ending 2 days before TODAY, so recency never
// interferes except in the tests that exercise it.
function recent(values: number[]): PlateauPoint[] {
  const last = new Date("2026-08-10T18:00:00Z").getTime();
  return values.map((value, i) => ({
    date: new Date(last - (values.length - 1 - i) * 4 * 86_400_000).toISOString(),
    value,
  }));
}

describe("plateauStatus", () => {
  it("reads a confidently flat series as stalled", () => {
    expect(plateauStatus(recent([185, 185, 185, 185]), TODAY)).toBe("stalled");
  });

  it("reads a confident decline as declining, not stalled", () => {
    // Perfectly linear drop: interval collapses to the slope, -5, below
    // -delta = -max(0.5, 217.5 * 0.01) = -2.175.
    expect(plateauStatus(recent([225, 220, 215, 210]), TODAY)).toBe("declining");
  });

  it("reads a trivial but confident slope as stalled", () => {
    // Linear 0.5/session: interval is exactly {0.5, 0.5}, below
    // delta = max(0.5, 100.75 * 0.01) = 1.0075. Real progress nobody can feel.
    expect(plateauStatus(recent([100, 100.5, 101, 101.5]), TODAY)).toBe("stalled");
  });

  it("never claims a stall from scattered sessions", () => {
    // The vector from the trend work: slope +5 through scatter, interval
    // {-1.67, 11.67} straddles delta 1.45 on both sides.
    expect(plateauStatus(recent([135, 150, 140, 155]), TODAY)).toBe("uncertain");
  });

  it("reads genuine progress as improving", () => {
    // 135, 140, 140, 145: interval {1.67, 4.33}, low above delta 1.4.
    expect(plateauStatus(recent([135, 140, 140, 145]), TODAY)).toBe("improving");
  });

  it("is uncertain when the interval sits exactly on the threshold", () => {
    // Mean 40 so delta is the 0.5 floor; exact linear slope 0.5 collapses the
    // interval to {0.5, 0.5}. Strict comparisons mean neither bound clears.
    expect(plateauStatus(recent([39.25, 39.75, 40.25, 40.75]), TODAY)).toBe(
      "uncertain",
    );
  });

  it("needs four sessions", () => {
    expect(plateauStatus(recent([185, 185, 185]), TODAY)).toBe("insufficient");
  });

  it("uses only the last four sessions", () => {
    // Two old improving points ahead of four flat ones: the window is flat.
    expect(
      plateauStatus(recent([100, 120, 185, 185, 185, 185]), TODAY),
    ).toBe("stalled");
  });

  it("reads a parked lift as stale, not stalled", () => {
    const points = recent([185, 185, 185, 185]).map((p, i, arr) =>
      i === arr.length - 1 ? { ...p, date: "2026-07-14T12:00:00Z" } : p,
    );
    // 29 days before TODAY.
    expect(plateauStatus(points, TODAY)).toBe("stale");
  });

  it("treats exactly 28 days as still fresh", () => {
    const points = recent([185, 185, 185, 185]).map((p, i, arr) =>
      i === arr.length - 1 ? { ...p, date: "2026-07-15T12:00:00Z" } : p,
    );
    expect(plateauStatus(points, TODAY)).toBe("stalled");
  });
});
