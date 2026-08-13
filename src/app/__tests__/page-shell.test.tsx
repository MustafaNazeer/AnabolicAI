// src/app/__tests__/page-shell.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardView } from "@/app/DashboardView";

describe("DashboardView", () => {
  beforeEach(() => localStorage.clear());

  it("renders the greeting, title, and a personal record", () => {
    render(
      <DashboardView
        name="Mustafa"
        weekly={{ workouts: 4, sets: 28, volume: 31200 }}
        streakWeeks={3}
        prs={[
          {
            exerciseId: "e1",
            exerciseName: "Bench Press",
            weight: 185,
            reps: 5,
            e1rm: 214,
            loggedAt: "2026-06-22T15:00:00Z",
          },
        ]}
        recent={[]}
        weekDays={[]}
        matrixDays={Array.from({ length: 35 }, (_, i) => ({
          dateKey: `2026-05-${String(i + 1).padStart(2, "0")}`,
          trained: false,
          volume: 0,
          prCount: 0,
        }))}
        aiInsights={false}
      />,
    );
    expect(screen.getByText("Welcome back, Mustafa")).toBeInTheDocument();
    expect(screen.getByText("Your week so far")).toBeInTheDocument();
    expect(screen.getByText(/Bench Press/)).toBeInTheDocument();
  });
});
