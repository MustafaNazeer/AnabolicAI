// src/app/__tests__/page-shell.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardView } from "@/app/DashboardView";

const WEEK = [
  "2026-08-10",
  "2026-08-11",
  "2026-08-12",
  "2026-08-13",
  "2026-08-14",
  "2026-08-15",
  "2026-08-16",
];

describe("DashboardView", () => {
  beforeEach(() => localStorage.clear());

  it("renders the greeting, the week and the three numbers", () => {
    render(
      <DashboardView
        name="Mustafa"
        weekly={{ workouts: 4, sets: 28, volume: 31200 }}
        streakWeeks={3}
        week={WEEK}
        today="2026-08-16"
        workoutDays={["2026-08-14"]}
        matrixDays={Array.from({ length: 35 }, (_, i) => ({
          dateKey: `2026-05-${String(i + 1).padStart(2, "0")}`,
          trained: false,
          volume: 0,
          prCount: 0,
        }))}
      />,
    );
    expect(screen.getByText("Welcome back, Mustafa")).toBeInTheDocument();
    expect(screen.getByText("Your week so far")).toBeInTheDocument();
    expect(screen.getByTestId("day-2026-08-14")).toHaveAttribute("data-trained", "true");
    expect(screen.getByText("28")).toBeInTheDocument();
  });

  // Home was cut back on 2026-08-16 and these four are the things that came
  // off it. Asserted by absence so that re-adding one is a decision rather
  // than an accident, and so the screen cannot quietly grow back.
  it("carries nothing below the three numbers", () => {
    render(
      <DashboardView
        name="Mustafa"
        weekly={{ workouts: 4, sets: 28, volume: 31200 }}
        streakWeeks={3}
        week={WEEK}
        today="2026-08-16"
        workoutDays={[]}
        matrixDays={[]}
      />,
    );
    expect(screen.queryByText(/recent personal records/i)).toBeNull();
    expect(screen.queryByText(/recent workouts/i)).toBeNull();
    expect(screen.queryByText(/what stands out this week/i)).toBeNull();
    expect(screen.queryByText(/goal/i)).toBeNull();
  });
});
