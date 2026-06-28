// src/components/__tests__/GoalsSummary.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoalsSummary } from "@/components/dashboard/GoalsSummary";

const goal = (over: Partial<Record<string, unknown>> = {}) => ({
  id: "g1",
  exerciseId: "ex1",
  exerciseName: "Bench Press",
  targetWeight: 225,
  targetReps: 5,
  status: "active" as const,
  createdAt: "2026-06-01T00:00:00Z",
  achievedAt: null,
  pct: 0.9,
  lbsToGo: 10,
  reached: false,
  ...over,
});

describe("GoalsSummary", () => {
  it("renders nothing when there are no active goals", () => {
    const { container } = render(<GoalsSummary goals={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("summarizes the count and the closest goal", () => {
    render(<GoalsSummary goals={[goal(), goal({ id: "g2", lbsToGo: 30 })]} />);
    expect(screen.getByText(/2 active goals/i)).toBeInTheDocument();
    expect(screen.getByText(/Bench Press/)).toBeInTheDocument();
    expect(screen.getByText(/10 lbs to go/i)).toBeInTheDocument();
  });
});
