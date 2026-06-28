import { describe, it, expect } from "vitest";
import { decideGoalNotification } from "@/lib/goals/notify";
import { goalTargetE1rm } from "@/lib/goals/progress";

const base = {
  targetWeight: 225,
  targetReps: 5,
  status: "active" as const,
  proximityNotified: false,
};

describe("decideGoalNotification", () => {
  it("returns reached when current best meets the target", () => {
    expect(decideGoalNotification(base, goalTargetE1rm(225, 5))).toEqual({
      action: "reached",
    });
  });

  it("nudges once when within 5 lbs and not yet notified", () => {
    const d = decideGoalNotification(base, goalTargetE1rm(221, 5));
    expect(d.action).toBe("nudge");
    if (d.action === "nudge") expect(d.lbsToGo).toBe(5);
  });

  it("does not nudge again once proximity_notified is set", () => {
    expect(
      decideGoalNotification(
        { ...base, proximityNotified: true },
        goalTargetE1rm(221, 5),
      ),
    ).toEqual({ action: "none" });
  });

  it("does nothing when far away", () => {
    expect(decideGoalNotification(base, goalTargetE1rm(150, 5))).toEqual({
      action: "none",
    });
  });

  it("does nothing for an already-achieved goal", () => {
    expect(
      decideGoalNotification(
        { ...base, status: "achieved" },
        goalTargetE1rm(300, 5),
      ),
    ).toEqual({ action: "none" });
  });
});
