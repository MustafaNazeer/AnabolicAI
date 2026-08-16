import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { PlannerWeek } from "@/components/PlannerWeek";

const week = [
  "2026-08-10",
  "2026-08-11",
  "2026-08-12",
  "2026-08-13",
  "2026-08-14",
  "2026-08-15",
  "2026-08-16",
];
const names = { c1: "Lower Body", c2: "Abs", c3: "Rest" };

describe("PlannerWeek", () => {
  it("shows every label a day carries, not just the first", () => {
    render(
      <PlannerWeek
        week={week}
        categoryNames={names}
        days={[{ day: "2026-08-10", done: true, categories: ["c1", "c2"] }]}
        onPick={() => {}}
      />,
    );
    expect(screen.getByText(/Lower Body/)).toBeInTheDocument();
    expect(screen.getByText(/Abs/)).toBeInTheDocument();
  });

  // A planned day and a day that happened must not look the same, or the
  // calendar makes the same claim the balance was careful not to make.
  it("marks a planned day as planned rather than done", () => {
    render(
      <PlannerWeek
        week={week}
        categoryNames={names}
        days={[{ day: "2026-08-11", done: false, categories: ["c1"] }]}
        onPick={() => {}}
      />,
    );
    expect(screen.getByTestId("planner-day-2026-08-11")).toHaveAttribute(
      "data-planned",
      "true",
    );
  });

  // The counterpart direction. Without it the attribute could be hardcoded to
  // "true" and the assertion above would still pass, which is the discrimination
  // gap this project keeps finding in tests that only check one side.
  it("does not mark a day that was actually done as planned", () => {
    render(
      <PlannerWeek
        week={week}
        categoryNames={names}
        days={[{ day: "2026-08-11", done: true, categories: ["c1"] }]}
        onPick={() => {}}
      />,
    );
    expect(screen.getByTestId("planner-day-2026-08-11")).toHaveAttribute(
      "data-planned",
      "false",
    );
  });

  it("renders all seven days even when only one has anything on it", () => {
    render(
      <PlannerWeek week={week} categoryNames={names} days={[]} onPick={() => {}} />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(7);
  });

  it("reports which day was tapped", async () => {
    const onPick = vi.fn();
    render(
      <PlannerWeek week={week} categoryNames={names} days={[]} onPick={onPick} />,
    );
    await userEvent.click(screen.getByTestId("planner-day-2026-08-13"));
    expect(onPick).toHaveBeenCalledWith("2026-08-13");
  });

  // Seven buttons whose visible text is a single letter, two of which repeat
  // twice, so the accessible name has to come from somewhere else. This project
  // holds accessibility 100 on every route and a new interactive surface is
  // exactly where that gets lost.
  it("names each day for a screen reader rather than leaving it as a letter", async () => {
    const { container } = render(
      <PlannerWeek
        week={week}
        categoryNames={names}
        days={[{ day: "2026-08-10", done: true, categories: ["c1"] }]}
        onPick={() => {}}
      />,
    );

    expect(screen.getByTestId("planner-day-2026-08-10")).toHaveAccessibleName(
      /monday/i,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
