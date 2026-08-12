import { describe, it, expect } from "vitest";
import { fitSlope, criticalT, slopeInterval } from "@/lib/progress/regression";

describe("fitSlope", () => {
  it("has nothing to fit with fewer than two points", () => {
    expect(fitSlope([])).toBeNull();
    expect(fitSlope([100])).toBeNull();
  });
  it("recovers the slope of a rising line", () => {
    expect(fitSlope([100, 105, 110, 115])?.slope).toBeCloseTo(5, 10);
  });
  it("recovers the slope of a falling line", () => {
    expect(fitSlope([115, 110, 105, 100])?.slope).toBeCloseTo(-5, 10);
  });
  it("reports no error when the fit is exact", () => {
    expect(fitSlope([100, 105, 110, 115])?.standardError).toBe(0);
  });
  it("reports no error for two points, which always fit exactly", () => {
    const fit = fitSlope([135, 140]);
    expect(fit?.standardError).toBe(0);
    expect(fit?.df).toBe(0);
  });
  it("counts degrees of freedom as n minus two", () => {
    expect(fitSlope([100, 105, 125])?.df).toBe(1);
    expect(fitSlope([100, 101, 100, 101])?.df).toBe(2);
  });
  it("reports a larger error as the points scatter", () => {
    const tight = fitSlope([100, 105, 110, 115])!.standardError;
    const loose = fitSlope([100, 130, 105, 115])!.standardError;
    expect(loose).toBeGreaterThan(tight);
  });
});

describe("criticalT", () => {
  it("matches the Cauchy closed form at one degree of freedom", () => {
    expect(criticalT(1, 0.2)).toBeCloseTo(Math.tan((Math.PI * 0.8) / 2), 10);
    expect(criticalT(1, 0.2)).toBeCloseTo(3.077684, 5);
  });
  it("matches the closed form at two degrees of freedom", () => {
    expect(criticalT(2, 0.2)).toBeCloseTo(1.885618, 5);
  });
  it("refuses a df the four session window cannot produce", () => {
    expect(() => criticalT(3, 0.2)).toThrow();
  });
});

describe("slopeInterval", () => {
  it("collapses to a point when the fit is exact", () => {
    const fit = fitSlope([100, 105, 110, 115])!;
    const { low, high } = slopeInterval(fit, 0.2);
    expect(low).toBeCloseTo(5, 10);
    expect(high).toBeCloseTo(5, 10);
  });
  it("collapses to a point for a two point fit, which has no spare degrees of freedom", () => {
    const fit = fitSlope([135, 140])!;
    const { low, high } = slopeInterval(fit, 0.2);
    expect(low).toBeCloseTo(5, 10);
    expect(high).toBeCloseTo(5, 10);
  });
  it("straddles zero when four points scatter", () => {
    const fit = fitSlope([135, 150, 140, 155])!;
    const { low, high } = slopeInterval(fit, 0.2);
    expect(low).toBeLessThan(0);
    expect(high).toBeGreaterThan(0);
  });
});
