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

describe("Heatmap, telling past from future", () => {
  // THE POINT OF THE X IS ORIENTATION. Numbers alone did not make it obvious
  // which day the calendar was sitting on, so every day already gone is
  // crossed, today carries the star, and days still to come are left plain.
  it("crosses every day before today and nothing from today onward", () => {
    const { container } = render(
      <Heatmap days={august()} metric="gym" today="2026-08-16" />,
    );
    // The 1st through the 15th, and not the 16th.
    expect(container.querySelectorAll('[data-past="1"]')).toHaveLength(15);
    expect(
      container.querySelector('[data-cell="2026-08-15"]')?.getAttribute("data-past"),
    ).toBe("1");
    expect(
      container.querySelector('[data-cell="2026-08-16"]')?.getAttribute("data-past"),
    ).toBe("0");
    expect(
      container.querySelector('[data-cell="2026-08-17"]')?.getAttribute("data-past"),
    ).toBe("0");
  });

  // THE X IS AN OVERLAY, NOT A REPLACEMENT. A past day that was trained keeps
  // the colour it earned; crossing it out instead of colouring it would hide
  // the one thing the grid exists to show.
  it("keeps the training colour on a past day that was trained", () => {
    const days = august();
    days[9] = { ...days[9], trained: true }; // the 10th
    const { container } = render(
      <Heatmap days={days} metric="gym" today="2026-08-16" />,
    );
    const tenth = container.querySelector('[data-cell="2026-08-10"]');
    expect(tenth?.getAttribute("data-past")).toBe("1");
    expect(tenth?.getAttribute("data-on")).toBe("1");
  });

  // Today is marked by the star and never by the X, or the day being looked
  // for would read as one already gone.
  it("marks today with a star and never crosses it", () => {
    const { container } = render(
      <Heatmap days={august()} metric="gym" today="2026-08-16" />,
    );
    const todayCell = container.querySelector('[data-cell="2026-08-16"]');
    expect(todayCell?.getAttribute("data-today")).toBe("1");
    expect(todayCell?.querySelector("[data-star]")).not.toBeNull();
    expect(todayCell?.querySelector("[data-struck]")).toBeNull();
  });

  // The star is filled rather than an outline, which is the difference between
  // a mark that reads at 11px on a phone and one that does not.
  it("draws the star solid rather than as an outline", () => {
    const { container } = render(
      <Heatmap days={august()} metric="gym" today="2026-08-16" />,
    );
    const star = container.querySelector("[data-star] polygon");
    expect(star?.getAttribute("fill")).toBe("currentColor");
  });

  // SHARPNESS IS A RATIO, NOT A LOOK. A five pointed star's points are as sharp
  // as its inner radius is small next to its outer one. Lucide's sits near 0.5,
  // which reads stubby at this size, so this asserts the shape is genuinely
  // narrower than that rather than asserting it "looks sharp", which no test
  // can do.
  it("draws the star with points sharper than a stock one", () => {
    const { container } = render(
      <Heatmap days={august()} metric="gym" today="2026-08-16" />,
    );
    const raw = container.querySelector("[data-star] polygon")?.getAttribute("points") ?? "";
    const pts = raw.trim().split(/\s+/).map((p) => p.split(",").map(Number));
    expect(pts).toHaveLength(10);

    const radii = pts.map(([x, y]) => Math.hypot(x - 12, y - 12));
    const outer = Math.max(...radii);
    const inner = Math.min(...radii);
    expect(inner / outer).toBeLessThan(0.42);
  });

  // The two marks are the same size. Today is not louder than a past day by
  // being bigger; it is louder by being the accent colour and a different
  // shape.
  it("draws the star at 24", () => {
    const { container } = render(
      <Heatmap days={august()} metric="gym" today="2026-08-16" />,
    );
    const star = container.querySelector("[data-star]");
    expect(star?.getAttribute("width")).toBe("24");
    // The two are no longer compared. The mark on a past day stopped being a
    // fixed size box and became a line spanning the whole cell, so there is no
    // longer a single number on both sides to hold equal.
  });

  // Nothing is crossed when the grid is drawing a month today is not in and
  // no key matches, rather than the whole month reading as gone.
  it("crosses a whole month that is entirely in the past", () => {
    const { container } = render(
      <Heatmap days={august()} metric="gym" today="2026-09-04" />,
    );
    expect(container.querySelectorAll('[data-past="1"]')).toHaveLength(31);
    expect(container.querySelectorAll("[data-star]")).toHaveLength(0);
  });
});

describe("Heatmap, the day number", () => {
  // Half again as large as it was, because at 9px in the corner of a cell it
  // was there without being readable at a glance, which is the same failure the
  // planner's own labels had.
  it("draws the day number at 12px", () => {
    const { container } = render(
      <Heatmap days={august()} metric="gym" today="2026-08-16" />,
    );
    const cell = container.querySelector('[data-cell="2026-08-16"]');
    const number = cell?.querySelector("[data-day-number]") as HTMLElement | null;
    expect(number).not.toBeNull();
    expect(number?.textContent).toBe("16");
    expect(number?.style.fontSize).toBe("12px");
  });
});

describe("Heatmap, the cross", () => {
  // POINTED, WHICH A STROKED LINE CANNOT BE. A stroke ends either flat (butt),
  // flat and overhanging (square) or rounded, and none of those is a point, so
  // A PLAIN STROKE, corner to corner of the cell. It was a tapered fill before,
  // which read as a blade rather than as a line struck through a day.
  it("strikes a past day with one plain line corner to corner", () => {
    const { container } = render(
      <Heatmap days={august()} metric="gym" today="2026-08-16" />,
    );
    const struck = container.querySelector("[data-struck]");
    expect(struck).not.toBeNull();

    // A stroked line, and nothing filled. The tapered polygons are gone.
    expect(struck?.querySelectorAll("polygon")).toHaveLength(0);
    const line = struck?.querySelector("line");
    expect(line).not.toBeNull();
    expect(line?.getAttribute("stroke")).toBe("currentColor");

    // TOP RIGHT TO BOTTOM LEFT, AND ALL THE WAY TO BOTH CORNERS. Anything less
    // than the full box leaves the line floating inside the square instead of
    // crossing it, and drawn the other way it would cut through the day number
    // in the top left.
    expect(line?.getAttribute("x1")).toBe("24");
    expect(line?.getAttribute("y1")).toBe("0");
    expect(line?.getAttribute("x2")).toBe("0");
    expect(line?.getAttribute("y2")).toBe("24");

    // The box is the whole cell rather than a fixed size centred in it, or
    // "corner to corner" would mean the corners of a smaller square.
    expect(struck?.getAttribute("width")).toBe("100%");
    expect((struck as HTMLElement | null)?.style.color).toBe("var(--text)");
  });

  // The number moved out of the tip's corner rather than the mark shrinking to
  // avoid it.
  it("puts the day number in the top left corner", () => {
    const { container } = render(
      <Heatmap days={august()} metric="gym" today="2026-08-16" />,
    );
    const number = container.querySelector("[data-day-number]") as HTMLElement | null;
    expect(number?.style.left).toBe("4px");
    expect(number?.style.right).toBe("");
  });
});
