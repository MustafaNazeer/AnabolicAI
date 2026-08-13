import { describe, it, expect } from "vitest";
import {
  buildInsightsMessage,
  INSIGHTS_SYSTEM_PROMPT,
} from "@/lib/ai/insights/prompt";

const LIFT = {
  name: "Bench Press",
  muscleGroup: "chest",
  trendWord: "Holding steady",
  stallCheck: "stalled",
  sessions: [
    { daysAgo: 12, sets: [{ reps: 5, weight: 185, rirLow: 1, rirHigh: 1 }] },
    { daysAgo: 0, sets: [{ reps: 5, weight: 185, rirLow: null, rirHigh: null }] },
  ],
};

const WEEK = { weeklyWorkouts: 3, weeklySets: 42, streakWeeks: 5 };

describe("buildInsightsMessage", () => {
  it("renders each lift with its verdicts and sessions oldest first", () => {
    const msg = buildInsightsMessage({ lifts: [LIFT], ...WEEK });
    expect(msg).toContain("Lift: Bench Press (chest)");
    expect(msg).toContain("Trend: Holding steady");
    expect(msg).toContain("Stall check: stalled");
    expect(msg).toContain("185 x 5 (RIR 1)");
    expect(msg.indexOf("12 days ago")).toBeGreaterThan(-1);
    expect(msg.indexOf("12 days ago")).toBeLessThan(msg.indexOf("today"));
    expect(msg).toContain("This week: 3 workouts, 42 sets. Streak: 5 weeks.");
  });

  it("separates two lifts with a blank line", () => {
    const second = { ...LIFT, name: "Squat", muscleGroup: null };
    const msg = buildInsightsMessage({ lifts: [LIFT, second], ...WEEK });
    expect(msg).toContain("Lift: Bench Press (chest)");
    expect(msg).toContain("\n\nLift: Squat\n");
  });

  it("omits the muscle group clause when the exercise has none", () => {
    const msg = buildInsightsMessage({
      lifts: [{ ...LIFT, muscleGroup: null }],
      ...WEEK,
    });
    expect(msg).toContain("Lift: Bench Press\n");
    expect(msg).not.toContain("(chest)");
  });

  it("collapses whitespace in a user supplied name so it cannot fabricate message lines", () => {
    const msg = buildInsightsMessage({
      lifts: [{ ...LIFT, name: "Bench\nPress" }],
      ...WEEK,
    });
    expect(msg).toContain("Lift: Bench Press");
    expect(msg).not.toContain("Bench\nPress");
  });

  it("caps a runaway exercise name at 80 characters", () => {
    const msg = buildInsightsMessage({
      lifts: [{ ...LIFT, name: "x".repeat(200), muscleGroup: null }],
      ...WEEK,
    });
    expect(msg).toContain(`Lift: ${"x".repeat(80)}\n`);
    expect(msg).not.toContain("x".repeat(81));
  });

  it("the system prompt defers stalled lifts to the Progress screen and forbids invention", () => {
    expect(INSIGHTS_SYSTEM_PROMPT).toContain("Progress screen");
    expect(INSIGHTS_SYSTEM_PROMPT).toContain("Never invent");
  });
});
