import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { suggestMock, setAiInsightsMock } = vi.hoisted(() => ({
  suggestMock: vi.fn(),
  setAiInsightsMock: vi.fn(),
}));

vi.mock("@/lib/ai/insights/actions", () => ({
  suggestInsights: suggestMock,
  setAiInsights: setAiInsightsMock,
}));

import { DashboardView } from "@/app/DashboardView";

const BASE = {
  name: "mustafa",
  weekly: { workouts: 3, sets: 42, volume: 12000 },
  streakWeeks: 5,
  prs: [],
  weekDays: [],
  matrixDays: [],
  goals: [],
  aiInsights: false,
};

const WORKOUT = {
  id: "session-1",
  routineName: "Push Day",
  completedAt: new Date().toISOString(),
  sets: 12,
  volume: 5400,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DashboardView insights wiring", () => {
  it("renders the insights card when there are recent workouts", () => {
    render(<DashboardView {...BASE} recent={[WORKOUT]} />);
    expect(
      screen.getByRole("button", { name: "What stands out this week?" }),
    ).toBeInTheDocument();
  });

  it("renders no insights card before the first workout", () => {
    render(<DashboardView {...BASE} recent={[]} />);
    expect(
      screen.queryByRole("button", { name: "What stands out this week?" }),
    ).not.toBeInTheDocument();
  });

  it("keys its dashboard lists uniquely, so React never sees duplicate sibling keys", () => {
    const warnings: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      warnings.push(args.map(String).join(" "));
    };
    try {
      render(<DashboardView {...BASE} recent={[WORKOUT]} />);
    } finally {
      console.error = original;
    }
    expect(warnings.filter((w) => w.includes("same key"))).toEqual([]);
  });
});
