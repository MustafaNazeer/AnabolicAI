import { describe, it, expect } from "vitest";
import { exerciseVolume, topSetReps } from "@/lib/progress/exerciseMetrics";

describe("exerciseVolume", () => {
  it("sums weight times reps across sets", () => {
    expect(
      exerciseVolume([
        { weight: 100, reps: 5 },
        { weight: 100, reps: 3 },
      ]),
    ).toBe(800);
  });

  it("is zero for no sets", () => {
    expect(exerciseVolume([])).toBe(0);
  });
});

describe("topSetReps", () => {
  it("returns the reps of the heaviest set", () => {
    expect(
      topSetReps([
        { weight: 135, reps: 8 },
        { weight: 185, reps: 3 },
      ]),
    ).toBe(3);
  });

  it("breaks a weight tie by the greatest reps at that weight", () => {
    expect(
      topSetReps([
        { weight: 185, reps: 3 },
        { weight: 185, reps: 5 },
        { weight: 135, reps: 10 },
      ]),
    ).toBe(5);
  });

  it("is zero for no sets", () => {
    expect(topSetReps([])).toBe(0);
  });
});
