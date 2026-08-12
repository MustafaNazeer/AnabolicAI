import { fitSlope, slopeInterval } from "@/lib/progress/regression";

export type TrendDirection = "up" | "flat" | "down";

// The last four sessions, which is what SPEC.md section 7 publishes. Raising
// this is not a local change: four points leave two degrees of freedom, and
// criticalT accepts only df 1 or 2 and throws for anything else, so a window
// of 5 would throw during server rendering of the Progress screen. Widen
// criticalT's domain first.
export const WINDOW = 4;

// Deliberately permissive, and this is a product decision rather than a
// statistical one. This is a direction hint read on a phone between sets, not
// a published finding. Four points leave two degrees of freedom, so the
// conventional 0.05 needs |t| > 4.30, and a real progression of
// 135, 140, 140, 145 comes out at 4.24 and would read as holding steady.
// Measured 2026-08-11.
export const ALPHA = 0.2;

// The smallest change worth calling a direction, unchanged from the threshold
// this file used before confidence was added. Confidence alone is not enough:
// a perfectly linear 100, 100.1, 100.2, 100.3 has zero residuals and therefore
// total confidence in a slope of 0.1, which is not progress anyone can feel.
export function meaningfulSlope(values: number[]): number {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.max(0.5, avg * 0.01);
}

export function trendDirection(values: number[]): TrendDirection {
  const recent = values.slice(-WINDOW);
  const fit = fitSlope(recent);
  if (!fit) return "flat";
  const delta = meaningfulSlope(recent);
  const { low, high } = slopeInterval(fit, ALPHA);
  // A direction is claimed only when the whole interval clears the meaningful
  // slope, so a large slope drawn through scattered sessions reads as steady
  // rather than overstating what four points can support.
  if (low > delta) return "up";
  if (high < -delta) return "down";
  return "flat";
}

export function trendLabel(dir: TrendDirection): string {
  if (dir === "up") return "Improving";
  if (dir === "down") return "Trending down";
  return "Holding steady";
}
