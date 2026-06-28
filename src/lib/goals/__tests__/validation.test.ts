import { describe, it, expect } from "vitest";
import { validateGoalInput } from "@/lib/goals/validation";

describe("validateGoalInput", () => {
  it("accepts a valid weight and rep count", () => {
    expect(validateGoalInput(225, 5)).toEqual({});
  });
  it("rejects negative or non-finite weight", () => {
    expect(validateGoalInput(-1, 5).error).toBeTruthy();
    expect(validateGoalInput(Number.NaN, 5).error).toBeTruthy();
  });
  it("rejects reps below 1 or non-integer", () => {
    expect(validateGoalInput(225, 0).error).toBeTruthy();
    expect(validateGoalInput(225, 2.5).error).toBeTruthy();
  });
});
