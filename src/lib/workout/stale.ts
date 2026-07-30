// A workout untouched for this long is treated as abandoned. Used by both the
// in-app banner, which re-evaluates on every page load, and the daily nudge.
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

// The newest logged set, or the session start when nothing was logged. Set
// times older than the start are ignored so a clock skew cannot make a fresh
// session look stale.
export function lastActivityAt(startedAt: string, setTimes: string[]): string {
  let newest = Date.parse(startedAt);
  let result = startedAt;
  for (const t of setTimes) {
    const ms = Date.parse(t);
    if (Number.isFinite(ms) && ms > newest) {
      newest = ms;
      result = t;
    }
  }
  return result;
}

export function isStale(lastActivity: string, now: Date): boolean {
  return now.getTime() - Date.parse(lastActivity) > STALE_AFTER_MS;
}
