import { describe, it, expect } from "vitest";
import { trendDirection, trendLabel } from "@/lib/progress/trend";

describe("trendDirection", () => {
  it("is flat with fewer than two points", () => {
    expect(trendDirection([100])).toBe("flat");
  });
  it("detects a rising series", () => {
    expect(trendDirection([100, 105, 110, 115])).toBe("up");
  });
  it("detects a falling series", () => {
    expect(trendDirection([115, 110, 105, 100])).toBe("down");
  });
  it("calls near-flat noise steady", () => {
    expect(trendDirection([100, 101, 100, 101])).toBe("flat");
  });
  it("uses only the last four points", () => {
    expect(trendDirection([10, 10, 100, 105, 110, 115])).toBe("up");
  });
  it("will not call a direction from four scattered sessions", () => {
    expect(trendDirection([135, 150, 140, 155])).toBe("flat");
  });
  it("does not mistake a tiny perfectly linear drift for progress", () => {
    expect(trendDirection([100, 100.1, 100.2, 100.3])).toBe("flat");
  });
  it("will not call a direction from two points", () => {
    expect(trendDirection([135, 135.1])).toBe("flat");
  });
  it("still calls a real progression improving", () => {
    expect(trendDirection([135, 140, 140, 145])).toBe("up");
  });
  it("will not call a direction from three scattered sessions", () => {
    expect(trendDirection([100, 105, 125])).toBe("flat");
  });
  it("calls a genuinely stalled lift steady", () => {
    expect(trendDirection([185, 185, 190, 185])).toBe("flat");
  });
  it("is flat with no points at all", () => {
    expect(trendDirection([])).toBe("flat");
  });
  it("is flat when nothing has changed", () => {
    expect(trendDirection([100, 100, 100, 100])).toBe("flat");
  });
});

describe("trendLabel", () => {
  it("speaks plainly", () => {
    expect(trendLabel("up")).toBe("Improving");
    expect(trendLabel("flat")).toBe("Holding steady");
    expect(trendLabel("down")).toBe("Trending down");
  });
});
