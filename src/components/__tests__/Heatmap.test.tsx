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
});
