export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

/**
 * Whole seconds remaining until `deadline`, never negative.
 *
 * `now` is a parameter rather than a call to `Date.now()` so a caller can be
 * tested against an arbitrary clock. Rounding up means half a second left still
 * reads as one, and only the deadline itself reads as zero.
 */
export function secondsUntil(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
