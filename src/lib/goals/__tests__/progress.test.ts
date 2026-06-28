import { describe, it, expect } from "vitest";
import {
  goalTargetE1rm,
  currentBestE1rm,
  goalProgress,
  withinProximity,
  displayLbsToGo,
} from "@/lib/goals/progress";

describe("goal progress helpers", () => {
  it("computes target e1rm with Epley", () => {
    // 200 * (1 + 5/30) = 233.33...
    expect(goalTargetE1rm(200, 5)).toBeCloseTo(233.333, 2);
  });

  it("takes the best e1rm across sets and 0 when empty", () => {
    expect(currentBestE1rm([])).toBe(0);
    const best = currentBestE1rm([
      { weight: 100, reps: 5 },
      { weight: 135, reps: 3 },
    ]);
    expect(best).toBeCloseTo(135 * (1 + 3 / 30), 5);
  });

  it("reports reached when current best meets the target e1rm", () => {
    const p = goalProgress(goalTargetE1rm(225, 5), 225, 5);
    expect(p.reached).toBe(true);
    expect(p.pct).toBe(1);
    expect(p.lbsToGo).toBe(0);
  });

  it("reports plain-weight lbs to go at the target rep count", () => {
    // currentBest equals the e1rm of 215x5; target is 225x5; gap ~10 lbs.
    const current = goalTargetE1rm(215, 5);
    const p = goalProgress(current, 225, 5);
    expect(p.reached).toBe(false);
    expect(p.lbsToGo).toBeCloseTo(10, 5);
    expect(p.pct).toBeGreaterThan(0.9);
    expect(p.pct).toBeLessThan(1);
  });

  it("withinProximity is exclusive of 0 and inclusive of the threshold", () => {
    expect(withinProximity(0)).toBe(false);
    expect(withinProximity(5)).toBe(true);
    expect(withinProximity(5.01)).toBe(false);
    expect(withinProximity(3)).toBe(true);
  });

  it("displayLbsToGo rounds to a friendly number, never 0 while distance remains", () => {
    expect(displayLbsToGo(0)).toBe(0);
    expect(displayLbsToGo(2)).toBe(5);
    expect(displayLbsToGo(7)).toBe(5);
    expect(displayLbsToGo(8)).toBe(10);
  });
});
