import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";

// The three surfaces are gated at three different call sites on three different
// screens, so each one is asserted where it actually renders. A single test of
// the flag would prove nothing about whether every site consults it.

vi.mock("@/components/InsightsCard", () => ({
  InsightsCard: () => <div data-testid="insights-card" />,
}));
vi.mock("@/components/PlateauCard", () => ({
  PlateauCard: () => <div data-testid="plateau-card" />,
}));

import { DashboardView } from "@/app/DashboardView";
import { ProgressView } from "@/components/ProgressView";

const DASHBOARD: Omit<ComponentProps<typeof DashboardView>, "aiVisible"> = {
  name: "Mustafa",
  weekly: { workouts: 2, sets: 12, volume: 4000 },
  streakWeeks: 1,
  prs: [],
  recent: [
    {
      id: "w1",
      routineName: "Push",
      completedAt: "2026-08-14T00:00:00.000Z",
      sets: 6,
      volume: 2000,
    },
  ],
  weekDays: [],
  matrixDays: [],
  goals: [],
  aiInsights: true,
};

const PROGRESS: Omit<ComponentProps<typeof ProgressView>, "aiVisible"> = {
  data: {
    exercises: [{ id: "ex-1", name: "Bench Press" }],
    series: {
      "ex-1": [
        {
          sessionId: "s-0",
          date: "2026-08-10T00:00:00.000Z",
          maxWeight: 185,
          e1rm: 185,
          volume: 1000,
          topSetReps: 5,
        },
      ],
    },
  },
  routineVolume: { routines: [], series: {} },
  goals: {},
  aiPlateau: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the AI visibility switch", () => {
  it("shows the insights card on the dashboard when visible", () => {
    render(<DashboardView {...DASHBOARD} aiVisible />);
    expect(screen.getByTestId("insights-card")).toBeInTheDocument();
  });

  it("removes the insights card from the dashboard when hidden", () => {
    render(<DashboardView {...DASHBOARD} aiVisible={false} />);
    expect(screen.queryByTestId("insights-card")).not.toBeInTheDocument();
  });

  it("shows the plateau card on progress when visible", () => {
    render(<ProgressView {...PROGRESS} aiVisible />);
    expect(screen.getByTestId("plateau-card")).toBeInTheDocument();
  });

  it("removes the plateau card from progress when hidden", () => {
    render(<ProgressView {...PROGRESS} aiVisible={false} />);
    expect(screen.queryByTestId("plateau-card")).not.toBeInTheDocument();
  });

  // Hiding is not consent. Someone with a feature enabled who hides the surface
  // must keep the enabled flag, so turning the switch back on restores what
  // they had rather than silently resetting them to off.
  it("hides a surface whose feature is enabled without disturbing the flag", () => {
    const { rerender } = render(
      <DashboardView {...DASHBOARD} aiVisible={false} />,
    );
    expect(screen.queryByTestId("insights-card")).not.toBeInTheDocument();

    rerender(<DashboardView {...DASHBOARD} aiVisible />);
    expect(screen.getByTestId("insights-card")).toBeInTheDocument();
  });
});
