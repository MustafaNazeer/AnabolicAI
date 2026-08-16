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

// The real window is five weeks ending on the current week's Sunday, so it
// always straddles two months. This is that shape: 2026-07-13 to 2026-08-16.
function spanTwoMonths(): MatrixDay[] {
  const july = Array.from({ length: 19 }, (_, i) => `2026-07-${String(i + 13).padStart(2, "0")}`);
  const august = Array.from({ length: 16 }, (_, i) => `2026-08-${String(i + 1).padStart(2, "0")}`);
  return [...july, ...august].map((dateKey) => ({
    dateKey,
    trained: false,
    volume: 0,
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
  it("numbers the cells of the month it is showing", () => {
    const { container } = render(
      <Heatmap days={spanTwoMonths()} metric="gym" today="2026-08-16" />,
    );
    expect(container.querySelector('[data-cell="2026-08-01"]')).toHaveTextContent("1");
    expect(container.querySelector('[data-cell="2026-08-09"]')).toHaveTextContent("9");
  });

  // The window is five weeks, so it always runs back into the month before it.
  // Numbering those too puts a second 1 through 31 in the same grid and the
  // reader cannot tell which month a number belongs to.
  it("leaves the neighbouring month's cells unnumbered", () => {
    const { container } = render(
      <Heatmap days={spanTwoMonths()} metric="gym" today="2026-08-16" />,
    );
    expect(container.querySelector('[data-cell="2026-07-20"]')?.textContent).toBe("");
    expect(container.querySelector('[data-cell="2026-07-31"]')?.textContent).toBe("");
  });

  // The number comes out of the key rather than through a Date, because
  // new Date("2026-08-01") is UTC midnight and reads as July 31st in this
  // app's own timezone.
  it("drops the leading zero rather than printing 01", () => {
    const { container } = render(
      <Heatmap days={spanTwoMonths()} metric="gym" today="2026-08-16" />,
    );
    expect(container.querySelector('[data-cell="2026-08-01"]')?.textContent).toBe("1");
  });

  it("marks today with a star and marks nothing else", () => {
    const { container } = render(
      <Heatmap days={spanTwoMonths()} metric="gym" today="2026-08-12" />,
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
      <Heatmap days={spanTwoMonths()} metric="gym" today="2026-09-09" />,
    );
    expect(container.querySelectorAll('[data-today="1"]')).toHaveLength(0);
  });
});
