import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { suggestMock, setAiInsightsMock, saveDayMock } = vi.hoisted(() => ({
  suggestMock: vi.fn(),
  setAiInsightsMock: vi.fn(),
  saveDayMock: vi.fn(async () => ({ ok: true as const })),
}));

vi.mock("@/lib/ai/insights/actions", () => ({
  suggestInsights: suggestMock,
  setAiInsights: setAiInsightsMock,
}));
vi.mock("@/lib/planner/dayActions", () => ({ savePlannerDay: saveDayMock }));

import { DashboardView } from "@/app/DashboardView";

const BASE = {
  name: "mustafa",
  weekly: { workouts: 3, sets: 42, volume: 12000 },
  streakWeeks: 5,
  prs: [],
  recent: [],
  weekDays: [],
  matrixDays: [],
  goals: [],
  aiInsights: false,
};

const WEEK = [
  "2026-08-10",
  "2026-08-11",
  "2026-08-12",
  "2026-08-13",
  "2026-08-14",
  "2026-08-15",
  "2026-08-16",
];

const CATEGORIES = [
  { id: "c1", name: "Lower Body" },
  { id: "c2", name: "Abs" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DashboardView planner gate", () => {
  // THE ASSERTION THE WHOLE FEATURE RESTS ON. Every account that is not gated
  // must see no trace of the planner, including the fact that it exists.
  it("renders nothing planner shaped for an account without the flag", () => {
    render(
      <DashboardView
        {...BASE}
        plannerOn={false}
        plannerWeekDays={WEEK}
        plannerDays={[{ day: "2026-08-10", done: true, categories: ["c1"] }]}
        plannerCategories={CATEGORIES}
      />,
    );
    expect(screen.queryByTestId("planner-day-2026-08-10")).toBeNull();
    // The balance is a second surface behind the same flag, and it is the one
    // that would leak a category name rather than only a shape.
    expect(screen.queryByText(/this week by category/i)).toBeNull();
    expect(screen.queryByTestId("balance-c1")).toBeNull();
  });

  // The counterpart direction, so the test above cannot be satisfied by a
  // component that never renders at all. Data is passed identically in both;
  // only the flag differs.
  it("renders the week for an account with the flag", () => {
    render(
      <DashboardView
        {...BASE}
        plannerOn
        plannerWeekDays={WEEK}
        plannerDays={[{ day: "2026-08-10", done: true, categories: ["c1"] }]}
        plannerCategories={CATEGORIES}
      />,
    );
    expect(screen.getByTestId("planner-day-2026-08-10")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^planner-day-/)).toHaveLength(7);
    expect(screen.getByTestId("balance-c1")).toHaveTextContent("1");
  });

  // The names come from the category list rather than from the day rows, which
  // carry ids only. A day resolving to a blank chip is how that wiring breaks.
  // WITHOUT THIS THE WHOLE SURFACE IS DECORATION. The strip and the sheet were
  // built as separate pieces and nothing in the plan ever mounted the second
  // one, so every day was tappable and no tap did anything.
  it("opens the sheet for the day that was tapped", async () => {
    render(
      <DashboardView
        {...BASE}
        plannerOn
        plannerWeekDays={WEEK}
        plannerDays={[]}
        plannerCategories={CATEGORIES}
      />,
    );
    expect(screen.queryByRole("button", { name: "Log it" })).toBeNull();

    await userEvent.click(screen.getByTestId("planner-day-2026-08-13"));
    expect(screen.getByRole("button", { name: "Log it" })).toBeInTheDocument();
  });

  // The sheet has to open on the day already as it stands, or saving it back
  // drops whatever was on it. The strip holds the rows; the sheet has to be
  // handed the right one.
  it("opens the sheet already carrying that day's labels", async () => {
    render(
      <DashboardView
        {...BASE}
        plannerOn
        plannerWeekDays={WEEK}
        plannerDays={[{ day: "2026-08-13", done: true, categories: ["c2"] }]}
        plannerCategories={CATEGORIES}
      />,
    );
    await userEvent.click(screen.getByTestId("planner-day-2026-08-13"));
    expect(screen.getByRole("button", { name: "Abs" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("resolves category ids to their names", () => {
    render(
      <DashboardView
        {...BASE}
        plannerOn
        plannerWeekDays={WEEK}
        plannerDays={[{ day: "2026-08-10", done: true, categories: ["c1", "c2"] }]}
        plannerCategories={CATEGORIES}
      />,
    );
    expect(screen.getByTestId("planner-day-2026-08-10")).toHaveTextContent(
      "Lower Body, Abs",
    );
  });
});
