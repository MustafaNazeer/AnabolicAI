import { describe, it, expect } from "vitest";
import {
  weekKey,
  isInCurrentWeek,
  currentStreakWeeks,
} from "@/lib/progress/week";

// 2026-06-21 is a Sunday; its Monday-start week begins 2026-06-15.
const now = new Date(2026, 5, 21);

describe("weekKey", () => {
  it("maps any day to its Monday", () => {
    expect(weekKey(new Date(2026, 5, 21))).toBe("2026-06-15"); // Sunday
    expect(weekKey(new Date(2026, 5, 15))).toBe("2026-06-15"); // Monday
    expect(weekKey(new Date(2026, 5, 17))).toBe("2026-06-15"); // Wednesday
  });
});

describe("isInCurrentWeek", () => {
  it("is true within the same Monday-start week", () => {
    expect(isInCurrentWeek(new Date(2026, 5, 16), now)).toBe(true);
    expect(isInCurrentWeek(new Date(2026, 5, 14), now)).toBe(false);
  });
});

describe("currentStreakWeeks", () => {
  it("is zero with no workouts", () => {
    expect(currentStreakWeeks([], now)).toBe(0);
  });
  it("counts consecutive weeks including the current one", () => {
    const dates = [new Date(2026, 5, 21), new Date(2026, 5, 10)]; // this week + prior week
    expect(currentStreakWeeks(dates, now)).toBe(2);
  });
  it("keeps a streak alive when the current week is empty", () => {
    const dates = [new Date(2026, 5, 10), new Date(2026, 5, 3)]; // prior two weeks, none this week
    expect(currentStreakWeeks(dates, now)).toBe(2);
  });
  it("stops at a gap", () => {
    const dates = [new Date(2026, 5, 21), new Date(2026, 5, 1)]; // this week, then a skipped week
    expect(currentStreakWeeks(dates, now)).toBe(1);
  });
});
