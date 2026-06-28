import { describe, it, expect } from "vitest";
import { shouldSendGoal } from "@/lib/notifications/gate";
import {
  goalReachedPayload,
  goalProximityPayload,
} from "@/lib/notifications/payloads";

describe("goal notification gate and payloads", () => {
  it("gates on master and goal toggles", () => {
    expect(shouldSendGoal({ notif_master: true, notif_goal: true })).toBe(true);
    expect(shouldSendGoal({ notif_master: false, notif_goal: true })).toBe(
      false,
    );
    expect(shouldSendGoal({ notif_master: true, notif_goal: false })).toBe(
      false,
    );
  });

  it("builds reached and proximity payloads to /progress", () => {
    const r = goalReachedPayload("Bench Press", 225, 5);
    expect(r.title).toBe("Goal reached");
    expect(r.body).toContain("Bench Press");
    expect(r.url).toBe("/progress");
    expect(r.tag).toBe("goal-reached");

    const n = goalProximityPayload("Bench Press", 5, 5);
    expect(n.title).toBe("Almost there");
    expect(n.body).toContain("5 lbs");
    expect(n.url).toBe("/progress");
    expect(n.tag).toBe("goal-near");
  });
});
