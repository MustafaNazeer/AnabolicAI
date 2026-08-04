// The wheel's bounds. user_settings.rest_timer_seconds is constrained to 1
// through 3600, so a value set from the Settings screen can sit outside these
// and gets clamped rather than silently rounded to something arbitrary.
export const MIN_REST_SECONDS = 5;
export const MAX_REST_SECONDS = 15 * 60;
export const SECOND_STEP = 5;

/** Snap to the five second grid and hold inside the wheel's range. */
export function clampRest(seconds: number): number {
  if (!Number.isFinite(seconds)) return 120;
  const snapped = Math.round(seconds / SECOND_STEP) * SECOND_STEP;
  return Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, snapped));
}

/**
 * A duration in words, for `aria-valuetext`. A screen reader announcing "150"
 * is useless; "2 minutes 30 seconds" is the whole point of the attribute.
 */
export function describeDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (m > 0) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
  if (s > 0) parts.push(`${s} second${s === 1 ? "" : "s"}`);
  return parts.length > 0 ? parts.join(" ") : "0 seconds";
}
