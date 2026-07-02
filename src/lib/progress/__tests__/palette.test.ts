import { describe, it, expect } from "vitest";
import { CHART_PALETTE, colorForIndex } from "@/lib/progress/palette";

describe("colorForIndex", () => {
  it("returns the palette entry at the index", () => {
    expect(colorForIndex(0)).toBe(CHART_PALETTE[0]);
    expect(colorForIndex(2)).toBe(CHART_PALETTE[2]);
  });

  it("cycles when the index exceeds the palette length", () => {
    expect(colorForIndex(CHART_PALETTE.length)).toBe(CHART_PALETTE[0]);
    expect(colorForIndex(CHART_PALETTE.length + 1)).toBe(CHART_PALETTE[1]);
  });

  it("is stable for a given index", () => {
    expect(colorForIndex(3)).toBe(colorForIndex(3));
  });

  it("has at least eight colors", () => {
    expect(CHART_PALETTE.length).toBeGreaterThanOrEqual(8);
  });
});
