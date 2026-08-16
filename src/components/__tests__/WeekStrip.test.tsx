import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { WeekStrip } from "@/components/dashboard/WeekStrip";

const week = [
  "2026-08-10",
  "2026-08-11",
  "2026-08-12",
  "2026-08-13",
  "2026-08-14",
  "2026-08-15",
  "2026-08-16",
];
const names = { c1: "Lower Body", c2: "Abs" };

describe("WeekStrip", () => {
  it("renders a cell per day of the week", () => {
    render(<WeekStrip week={week} workoutDays={[]} />);
    expect(screen.getAllByTestId(/^day-\d{4}-/)).toHaveLength(7);
  });

  // The day of the month and the mark for today belong to the five week matrix
  // below this bar, not to the bar. This asserts the division stays put, since
  // putting the numbers here once already made the two calendars say the same
  // thing twice.
  it("shows the weekday letter and not the day of the month", () => {
    render(<WeekStrip week={week} workoutDays={[]} />);
    const monday = screen.getByTestId("day-2026-08-10");
    expect(monday).toHaveTextContent("M");
    expect(monday).not.toHaveTextContent("10");
  });

  // Every account gets this strip now, so a day with a logged workout has to
  // read as trained without any planner data at all.
  it("marks a day with a logged workout as trained, with no planner rows", () => {
    render(<WeekStrip week={week} workoutDays={["2026-08-12"]} />);
    expect(screen.getByTestId("day-2026-08-12")).toHaveAttribute("data-trained", "true");
    expect(screen.getByTestId("day-2026-08-11")).toHaveAttribute("data-trained", "false");
  });

  it("shows every label a planner day carries", () => {
    render(
      <WeekStrip
        week={week}
        workoutDays={[]}
        categoryNames={names}
        days={[{ day: "2026-08-10", done: true, categories: ["c1", "c2"] }]}
      />,
    );
    expect(screen.getByTestId("day-2026-08-10")).toHaveTextContent("Lower Body, Abs");
  });

  // THE REGRESSION THIS EXISTS FOR. A planned day's label was drawn in
  // var(--text-dim) at 8.5px and was invisible on a real phone, so the day read
  // as empty while the database held a category for it.
  it("draws a planned day's label in readable text rather than dimmed", () => {
    render(
      <WeekStrip
        week={week}
        workoutDays={[]}
        categoryNames={names}
        days={[{ day: "2026-08-11", done: false, categories: ["c1"] }]}
      />,
    );
    const label = screen.getByTestId("day-label-2026-08-11");
    expect(label).toHaveTextContent("Lower Body");
    expect(label.style.color).not.toBe("var(--text-dim)");
    expect(label.style.color).toBe("var(--text)");
  });

  it("separates a planned day from a done one", () => {
    render(
      <WeekStrip
        week={week}
        workoutDays={[]}
        categoryNames={names}
        days={[
          { day: "2026-08-11", done: false, categories: ["c1"] },
          { day: "2026-08-12", done: true, categories: ["c1"] },
        ]}
      />,
    );
    expect(screen.getByTestId("day-2026-08-11")).toHaveAttribute("data-planned", "true");
    expect(screen.getByTestId("day-2026-08-12")).toHaveAttribute("data-planned", "false");
    expect(screen.getByTestId("day-2026-08-12")).toHaveAttribute("data-trained", "true");
  });

  // An account without the planner has nothing to open, so the days must not be
  // buttons at all. A control that does nothing when tapped is worse than no
  // control, and a screen reader would announce seven of them.
  it("renders no buttons when there is nothing to open", () => {
    render(<WeekStrip week={week} workoutDays={[]} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("renders a button per day and reports taps when it can be opened", async () => {
    const onPick = vi.fn();
    render(<WeekStrip week={week} workoutDays={[]} onPick={onPick} />);
    expect(screen.getAllByRole("button")).toHaveLength(7);
    await userEvent.click(screen.getByTestId("day-2026-08-13"));
    expect(onPick).toHaveBeenCalledWith("2026-08-13");
  });

  // Two of the seven visible letters repeat, so the letter cannot identify a
  // day to a screen reader. The date it does not show is spelled out here.
  it("names each day for a screen reader in both modes", async () => {
    const { container, rerender } = render(
      <WeekStrip week={week} workoutDays={["2026-08-16"]} />,
    );
    expect(screen.getByTestId("day-2026-08-16")).toHaveAccessibleName(/sunday 16/i);
    expect(await axe(container)).toHaveNoViolations();

    rerender(<WeekStrip week={week} workoutDays={[]} onPick={() => {}} />);
    expect(screen.getByTestId("day-2026-08-10")).toHaveAccessibleName(/monday 10/i);
    expect(await axe(container)).toHaveNoViolations();
  });
});
