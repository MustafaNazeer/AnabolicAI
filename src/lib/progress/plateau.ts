import { fitSlope, slopeInterval } from "@/lib/progress/regression";
import { ALPHA, WINDOW, meaningfulSlope } from "@/lib/progress/trend";

export type PlateauStatus =
  | "insufficient"
  | "stale"
  | "improving"
  | "uncertain"
  | "stalled"
  | "declining";

export type PlateauPoint = { date: string; value: number };

// A lift whose most recent session is older than this is parked rather than
// stalled, and advice about it would be noise. 28 days is four training weeks.
export const PLATEAU_RECENCY_DAYS = 28;

const DAY_MS = 86_400_000;

/**
 * Whether the last four sessions confidently rule progress out. "stalled" and
 * "declining" are strictly stronger claims than the trend's "flat" and "down":
 * the whole confidence interval must sit below the meaningful slope, so
 * scattered sessions read as "uncertain" and never earn a card. The trend
 * indicator's words are untouched by this; the two rules share WINDOW, ALPHA
 * and meaningfulSlope so they cannot drift.
 */
export function plateauStatus(
  points: PlateauPoint[],
  today: Date,
): PlateauStatus {
  if (points.length < WINDOW) return "insufficient";
  const recent = points.slice(-WINDOW);
  const last = new Date(recent[recent.length - 1].date);
  if (today.getTime() - last.getTime() > PLATEAU_RECENCY_DAYS * DAY_MS) {
    return "stale";
  }
  const values = recent.map((p) => p.value);
  const fit = fitSlope(values);
  if (!fit) return "uncertain";
  const delta = meaningfulSlope(values);
  const { low, high } = slopeInterval(fit, ALPHA);
  if (low > delta) return "improving";
  if (high < -delta) return "declining";
  if (high < delta) return "stalled";
  return "uncertain";
}
