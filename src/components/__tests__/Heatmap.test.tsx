import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Heatmap } from "@/components/dashboard/Heatmap";
import type { MatrixDay } from "@/lib/progress/matrix";

function makeDays(): MatrixDay[] {
  return Array.from({ length: 35 }, (_, i) => ({
    dateKey: `2026-05-${String(i + 1).padStart(2, "0")}`,
    trained: i === 30,
    volume: i === 30 ? 5000 : 0,
    prCount: 0,
  }));
}

describe("Heatmap", () => {
  it("renders 35 cells and lights trained days under the gym metric", () => {
    const { container } = render(<Heatmap days={makeDays()} metric="gym" />);
    const cells = container.querySelectorAll("[data-cell]");
    expect(cells).toHaveLength(35);
    const on = container.querySelectorAll('[data-on="1"]');
    expect(on).toHaveLength(1);
  });

  // This is the month calendar, so a cell has to say which day of the month it
  // is. Without a number the grid shows a shape and leaves the reader counting
  // squares to work out which day lit up.
  it("numbers every cell with its day of the month", () => {
    const { container } = render(<Heatmap days={makeDays()} metric="gym" />);
    expect(container.querySelector('[data-cell="2026-05-01"]')).toHaveTextContent("1");
    expect(container.querySelector('[data-cell="2026-05-09"]')).toHaveTextContent("9");
    expect(container.querySelector('[data-cell="2026-05-31"]')).toHaveTextContent("31");
  });

  // The number comes out of the key rather than through a Date, because
  // new Date("2026-05-01") is UTC midnight and reads as April 30th in this
  // app's own timezone.
  it("drops the leading zero rather than printing 01", () => {
    const { container } = render(<Heatmap days={makeDays()} metric="gym" />);
    expect(container.querySelector('[data-cell="2026-05-01"]')?.textContent).toBe("1");
  });

  it("marks today with a star and marks nothing else", () => {
    const { container } = render(
      <Heatmap days={makeDays()} metric="gym" today="2026-05-12" />,
    );
    const todayCell = container.querySelector('[data-today="1"]');
    expect(todayCell).toHaveAttribute("data-cell", "2026-05-12");
    expect(container.querySelectorAll('[data-today="1"]')).toHaveLength(1);
    // The star replaces the number, so today reads as today rather than as a
    // date the reader has to compare against their own knowledge of it.
    expect(todayCell?.querySelector("svg")).not.toBeNull();
    expect(todayCell).not.toHaveTextContent("12");
  });

  // A month that is not the current one has no today in it at all, and the grid
  // must not invent one.
  it("marks no cell when today falls outside the window", () => {
    const { container } = render(
      <Heatmap days={makeDays()} metric="gym" today="2026-09-09" />,
    );
    expect(container.querySelectorAll('[data-today="1"]')).toHaveLength(0);
  });
});
