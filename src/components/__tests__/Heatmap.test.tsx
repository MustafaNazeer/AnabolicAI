import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Heatmap } from "@/components/dashboard/Heatmap";
import type { MatrixDay } from "@/lib/progress/matrix";


// The window is now one month, first day to last. August 2026 has 31 days and
// starts on a Saturday, so it needs five empty places before the 1st.
function august(): MatrixDay[] {
  return Array.from({ length: 31 }, (_, i) => ({
    dateKey: `2026-08-${String(i + 1).padStart(2, "0")}`,
    trained: false,
    volume: 0,
    prCount: 0,
  }));
}

describe("Heatmap", () => {
  // ONE SQUARE PER DAY OF THE MONTH AND NOT ONE MORE. A 31 day month draws 31.
  it("renders one cell per day of the month and lights trained days", () => {
    const days = august();
    days[30] = { ...days[30], trained: true };
    const { container } = render(<Heatmap days={days} metric="gym" />);
    expect(container.querySelectorAll("[data-cell]")).toHaveLength(31);
    expect(container.querySelectorAll('[data-on="1"]')).toHaveLength(1);
  });

  it("draws 30 for a 30 day month", () => {
    const june = Array.from({ length: 30 }, (_, i) => ({
      dateKey: `2026-06-${String(i + 1).padStart(2, "0")}`,
      trained: false,
      volume: 0,
      prCount: 0,
    }));
    const { container } = render(<Heatmap days={june} metric="gym" />);
    expect(container.querySelectorAll("[data-cell]")).toHaveLength(30);
  });

  // A month that does not begin on a Monday needs empty places before its 1st,
  // or every column names the wrong weekday. They are gaps rather than squares,
  // so they carry no date and are not cells.
  it("pads the first row so the columns still mean weekdays", () => {
    const { container } = render(<Heatmap days={august()} metric="gym" />);
    // 2026-08-01 is a Saturday, which is the sixth column in a Monday first
    // grid, so five places come before it.
    expect(container.querySelectorAll("[data-blank]")).toHaveLength(5);
    expect(container.querySelectorAll("[data-blank][data-cell]")).toHaveLength(0);
  });

  it("needs no padding for a month that starts on a Monday", () => {
    const june = Array.from({ length: 30 }, (_, i) => ({
      dateKey: `2026-06-${String(i + 1).padStart(2, "0")}`,
      trained: false,
      volume: 0,
      prCount: 0,
    }));
    const { container } = render(<Heatmap days={june} metric="gym" />);
    expect(container.querySelectorAll("[data-blank]")).toHaveLength(0);
  });

  // This is the month calendar, so a cell has to say which day of the month it
  // is. Without a number the grid shows a shape and leaves the reader counting
  // squares to work out which day lit up.
  it("numbers every cell with its day of the month", () => {
    const { container } = render(<Heatmap days={august()} metric="gym" />);
    expect(container.querySelector('[data-cell="2026-08-01"]')).toHaveTextContent("1");
    expect(container.querySelector('[data-cell="2026-08-09"]')).toHaveTextContent("9");
    expect(container.querySelector('[data-cell="2026-08-31"]')).toHaveTextContent("31");
  });

  // The number comes out of the key rather than through a Date, because
  // new Date("2026-08-01") is UTC midnight and reads as July 31st in this
  // app's own timezone.
  it("drops the leading zero rather than printing 01", () => {
    const { container } = render(
      <Heatmap days={august()} metric="gym" today="2026-08-16" />,
    );
    expect(container.querySelector('[data-cell="2026-08-01"]')?.textContent).toBe("1");
  });

  it("marks today with a star and marks nothing else", () => {
    const { container } = render(
      <Heatmap days={august()} metric="gym" today="2026-08-12" />,
    );
    const todayCell = container.querySelector('[data-today="1"]');
    expect(todayCell).toHaveAttribute("data-cell", "2026-08-12");
    expect(container.querySelectorAll('[data-today="1"]')).toHaveLength(1);
    // The star sits alongside the number rather than replacing it, now that the
    // number lives in the corner. Today keeps its date.
    expect(todayCell?.querySelector("svg")).not.toBeNull();
    expect(todayCell).toHaveTextContent("12");
  });

  // A month that is not the current one has no today in it at all, and the grid
  // must not invent one.
  it("marks no cell when today falls outside the window", () => {
    const { container } = render(
      <Heatmap days={august()} metric="gym" today="2026-09-09" />,
    );
    expect(container.querySelectorAll('[data-today="1"]')).toHaveLength(0);
  });
});
