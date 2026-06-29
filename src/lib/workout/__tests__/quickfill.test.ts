import { describe, it, expect } from "vitest";
import { lastSetForNumber } from "@/lib/workout/quickfill";
import type { LastSet } from "@/lib/workout/types";

const sets: LastSet[] = [
  { set_number: 1, reps: 8, weight: 135, rir: 2 },
  { set_number: 2, reps: 6, weight: 145, rir: 1 },
  { set_number: 3, reps: 5, weight: 155, rir: 0 },
];

describe("lastSetForNumber", () => {
  it("returns the set whose number matches", () => {
    expect(lastSetForNumber(sets, 2)).toEqual({
      set_number: 2,
      reps: 6,
      weight: 145,
      rir: 1,
    });
  });

  it("falls back to the highest set when the number exceeds history", () => {
    expect(lastSetForNumber(sets, 5)).toEqual({
      set_number: 3,
      reps: 5,
      weight: 155,
      rir: 0,
    });
  });

  it("returns undefined when there is no history", () => {
    expect(lastSetForNumber([], 1)).toBeUndefined();
  });

  it("returns the only set for both an exact match and a fallback", () => {
    const one: LastSet[] = [{ set_number: 1, reps: 10, weight: 95, rir: 3 }];
    expect(lastSetForNumber(one, 1)).toEqual(one[0]);
    expect(lastSetForNumber(one, 2)).toEqual(one[0]);
  });
});
