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
});

describe("trendLabel", () => {
  it("speaks plainly", () => {
    expect(trendLabel("up")).toBe("Improving");
    expect(trendLabel("flat")).toBe("Holding steady");
    expect(trendLabel("down")).toBe("Trending down");
  });
});
