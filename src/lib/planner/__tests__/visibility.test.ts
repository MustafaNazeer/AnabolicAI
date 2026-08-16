import { describe, it, expect } from "vitest";
import { hasWeekPlanner } from "@/lib/planner/visibility";

describe("hasWeekPlanner", () => {
  // This gate decides whether an entirely different way of logging appears,
  // and unlike ai_visible it is set by an admin rather than by its owner. So a
  // missing row, or a read that failed and returned nothing, must read as OFF.
  // canUseAi takes the same position on approval for the same reason: an empty
  // result is not permission.
  it("reads a missing settings row as off", () => {
    expect(hasWeekPlanner(null)).toBe(false);
    expect(hasWeekPlanner(undefined)).toBe(false);
  });

  it("is off when the column is false", () => {
    expect(hasWeekPlanner({ week_planner: false })).toBe(false);
  });

  it("is on when the column is true", () => {
    expect(hasWeekPlanner({ week_planner: true })).toBe(true);
  });
});
