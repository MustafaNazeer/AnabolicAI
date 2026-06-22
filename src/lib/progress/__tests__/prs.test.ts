import { describe, it, expect } from "vitest";
import { detectPrs } from "@/lib/progress/prs";

describe("detectPrs", () => {
  it("does not announce the first set as a PR", () => {
    const prs = detectPrs([
      { exerciseId: "a", exerciseName: "Bench Press", weight: 135, reps: 5, loggedAt: "2026-06-01T10:00:00Z" },
    ]);
    expect(prs).toHaveLength(0);
  });
  it("announces a set that beats the prior best estimated 1RM", () => {
    const prs = detectPrs([
      { exerciseId: "a", exerciseName: "Bench Press", weight: 135, reps: 5, loggedAt: "2026-06-01T10:00:00Z" },
      { exerciseId: "a", exerciseName: "Bench Press", weight: 185, reps: 5, loggedAt: "2026-06-08T10:00:00Z" },
    ]);
    expect(prs).toHaveLength(1);
    expect(prs[0]).toMatchObject({ exerciseName: "Bench Press", weight: 185, reps: 5 });
  });
  it("does not announce a strictly worse set", () => {
    const prs = detectPrs([
      { exerciseId: "a", exerciseName: "Squat", weight: 225, reps: 5, loggedAt: "2026-06-01T10:00:00Z" },
      { exerciseId: "a", exerciseName: "Squat", weight: 185, reps: 5, loggedAt: "2026-06-08T10:00:00Z" },
    ]);
    expect(prs).toHaveLength(0);
  });
  it("tracks records per exercise independently", () => {
    const prs = detectPrs([
      { exerciseId: "a", exerciseName: "Bench Press", weight: 135, reps: 5, loggedAt: "2026-06-01T10:00:00Z" },
      { exerciseId: "b", exerciseName: "Squat", weight: 225, reps: 5, loggedAt: "2026-06-01T11:00:00Z" },
      { exerciseId: "a", exerciseName: "Bench Press", weight: 145, reps: 5, loggedAt: "2026-06-08T10:00:00Z" },
    ]);
    expect(prs).toHaveLength(1);
    expect(prs[0].exerciseName).toBe("Bench Press");
  });
});
