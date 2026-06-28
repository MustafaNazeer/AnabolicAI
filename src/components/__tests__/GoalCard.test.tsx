// src/components/__tests__/GoalCard.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoalCard } from "@/components/GoalCard";

vi.mock("@/lib/goals/actions", () => ({
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
}));

describe("GoalCard", () => {
  it("prompts to set a goal when there is none", () => {
    render(
      <GoalCard
        exerciseId="ex1"
        active={null}
        achieved={[]}
      />,
    );
    expect(
      screen.getByRole("button", { name: /set a goal/i }),
    ).toBeInTheDocument();
  });

  it("shows the active target and plain-language remaining", () => {
    render(
      <GoalCard
        exerciseId="ex1"
        active={{
          id: "g1",
          exerciseId: "ex1",
          exerciseName: "Bench Press",
          targetWeight: 225,
          targetReps: 5,
          status: "active",
          createdAt: "2026-06-01T00:00:00Z",
          achievedAt: null,
          pct: 0.9,
          lbsToGo: 10,
          reached: false,
        }}
        achieved={[]}
      />,
    );
    expect(screen.getByText(/225 lbs x 5/i)).toBeInTheDocument();
    expect(screen.getByText(/10 lbs to go/i)).toBeInTheDocument();
  });

  it("lists achieved history with a date", () => {
    render(
      <GoalCard
        exerciseId="ex1"
        active={null}
        achieved={[
          {
            id: "g0",
            exerciseId: "ex1",
            exerciseName: "Bench Press",
            targetWeight: 205,
            targetReps: 5,
            status: "achieved",
            createdAt: "2026-05-01T00:00:00Z",
            achievedAt: "2026-05-20T00:00:00Z",
            pct: 1,
            lbsToGo: 0,
            reached: true,
          },
        ]}
      />,
    );
    expect(screen.getByText(/205 lbs x 5/i)).toBeInTheDocument();
    const reachedEl = screen.getByText(/reached/i);
    expect(reachedEl).toBeInTheDocument();
    // Assert that a date (digit) was rendered alongside "Reached" — the exact
    // day number depends on the runner's local timezone offset from UTC, so we
    // match any digit rather than hardcoding "20".
    expect(reachedEl.textContent).toMatch(/\d/);
  });
});
