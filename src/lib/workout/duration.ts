// The bounds a rest may take. user_settings.rest_timer_seconds is constrained
// to 1 through 3600, so a value set from the Settings screen can sit outside
// these and gets clamped rather than rejected.
export const MIN_REST_SECONDS = 5;
export const MAX_REST_SECONDS = 15 * 60;

/** Round to a whole second and hold inside the range a rest may take. */
export function clampRest(seconds: number): number {
  if (!Number.isFinite(seconds)) return 120;
  return Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, Math.round(seconds)));
}

/**
 * Read the two typed boxes into a duration.
 *
 * Returns null when both are empty, which the panel treats as "close and
 * change nothing" rather than as an error. A blank box on one side alone
 * reads as zero, so "3" with blank seconds is three minutes and blank minutes
 * with "45" is forty five seconds. Seconds past 59 roll over into minutes, so
 * there is no invalid state to report and no error copy to write.
 */
export function parseTypedDuration(
  minutes: string,
  seconds: string,
): number | null {
  const m = minutes.trim();
  const s = seconds.trim();
  if (m === "" && s === "") return null;

  const mv = Number(m === "" ? "0" : m);
  const sv = Number(s === "" ? "0" : s);
  // The panel filters to digits, so this is unreachable from the UI. Refusing
  // rather than guessing keeps a stray value from becoming a saved default.
  if (!Number.isFinite(mv) || !Number.isFinite(sv)) return null;

  return clampRest(mv * 60 + sv);
}

/**
 * A duration in words. Used for the Set button's accessible name, because a
 * screen reader announcing "150" is useless where "2 minutes 30 seconds" is
 * exactly what the user is about to commit.
 */
export function describeDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (m > 0) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
  if (s > 0) parts.push(`${s} second${s === 1 ? "" : "s"}`);
  return parts.length > 0 ? parts.join(" ") : "0 seconds";
}
