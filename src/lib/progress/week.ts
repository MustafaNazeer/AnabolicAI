export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 Sunday .. 6 Saturday
  const sinceMonday = (day + 6) % 7;
  d.setDate(d.getDate() - sinceMonday);
  return d;
}

export function weekKey(date: Date): string {
  const w = startOfWeek(date);
  const m = String(w.getMonth() + 1).padStart(2, "0");
  const d = String(w.getDate()).padStart(2, "0");
  return `${w.getFullYear()}-${m}-${d}`;
}

export function isInCurrentWeek(date: Date, now: Date): boolean {
  return weekKey(date) === weekKey(now);
}

function previousWeek(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7);
}

export function currentStreakWeeks(dates: Date[], now: Date): number {
  if (dates.length === 0) return 0;
  const weeks = new Set(dates.map(weekKey));
  let cursor = startOfWeek(now);
  if (!weeks.has(weekKey(cursor))) {
    cursor = previousWeek(cursor);
  }
  let streak = 0;
  while (weeks.has(weekKey(cursor))) {
    streak++;
    cursor = previousWeek(cursor);
  }
  return streak;
}
