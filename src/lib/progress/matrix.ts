import { setVolume, formatCompact } from "@/lib/progress/strength";
import { zonedNow } from "@/lib/notifications/schedule";

export type MatrixMetric = "gym" | "volume" | "prs";

export type MatrixDay = {
  dateKey: string;
  trained: boolean;
  volume: number;
  prCount: number;
};

// Caller is responsible for passing a Date whose local fields are already in the target timezone.
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function dateKeyInZone(iso: string, timeZone: string): string {
  return dayKey(zonedNow(new Date(iso), timeZone));
}

// Every day of the month `now` falls in, one key per day, first to last.
//
// THIS REPLACED A ROLLING FIVE WEEK WINDOW on 2026-08-16. That window always
// carried part of the month before it, so once the cells were numbered the grid
// showed two 1 through 31 runs with nothing to say which was which. A calendar
// of one month has one square per day and no square for any other day.
//
// The month is resolved in `timeZone` through zonedNow, because 01:00Z on the
// 1st is still the previous month in Chicago; resolving in UTC would show the
// wrong month for five hours at every boundary. Day 0 of the following month is
// the last day of this one, which is how February gets 28 or 29 without a leap
// year rule written here.
export function monthWindow(now: Date, timeZone: string): string[] {
  const local = zonedNow(now, timeZone);
  const year = local.getFullYear();
  const month = local.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const keys: string[] = [];
  for (let d = 1; d <= lastDay; d++) {
    keys.push(dayKey(new Date(year, month, d)));
  }
  return keys;
}

// How many empty places sit before the first of the month in a Monday first
// grid. Without them every column would name the wrong weekday for any month
// that does not begin on a Monday.
//
// Built from the key's own parts rather than by parsing it, since
// new Date("2026-08-01") is UTC midnight and lands on July 31st in this app's
// zone, which would shift the whole grid by a column.
export function leadingBlanks(firstKey: string): number {
  const year = Number(firstKey.slice(0, 4));
  const month = Number(firstKey.slice(5, 7)) - 1;
  const day = Number(firstKey.slice(8, 10));
  const weekday = new Date(year, month, day).getDay(); // 0 Sunday .. 6 Saturday
  return (weekday + 6) % 7;
}

export type MatrixInput = {
  sessions: { completedAt: string }[];
  sets: { weight: number; reps: number; loggedAt: string }[];
  prDates: string[];
};

export function buildMatrix(
  input: MatrixInput,
  now: Date,
  timeZone: string,
): MatrixDay[] {
  const keys = monthWindow(now, timeZone);
  const inWindow = new Set(keys);

  const trained = new Set<string>();
  for (const s of input.sessions) {
    const k = dateKeyInZone(s.completedAt, timeZone);
    if (inWindow.has(k)) trained.add(k);
  }

  const volumeByDay = new Map<string, number>();
  for (const st of input.sets) {
    const k = dateKeyInZone(st.loggedAt, timeZone);
    if (!inWindow.has(k)) continue;
    volumeByDay.set(k, (volumeByDay.get(k) ?? 0) + setVolume(st.weight, st.reps));
  }

  const prByDay = new Map<string, number>();
  for (const iso of input.prDates) {
    const k = dateKeyInZone(iso, timeZone);
    if (!inWindow.has(k)) continue;
    prByDay.set(k, (prByDay.get(k) ?? 0) + 1);
  }

  return keys.map((k) => ({
    dateKey: k,
    trained: trained.has(k),
    volume: volumeByDay.get(k) ?? 0,
    prCount: prByDay.get(k) ?? 0,
  }));
}

export type CellState = "off" | "faint" | "on";

export function cellState(day: MatrixDay, metric: MatrixMetric): CellState {
  if (metric === "gym") return day.trained ? "on" : "off";
  if (metric === "volume") return day.volume > 0 ? "on" : "off";
  return day.prCount > 0 ? "on" : day.trained ? "faint" : "off";
}

export function maxVolume(days: MatrixDay[]): number {
  return days.reduce((m, d) => (d.volume > m ? d.volume : m), 0);
}

export function cellIntensity(
  day: MatrixDay,
  metric: MatrixMetric,
  max: number,
): number {
  const state = cellState(day, metric);
  if (state === "off") return 0;
  if (state === "faint") return 0.18;
  if (metric === "volume") return max > 0 ? 0.22 + 0.78 * (day.volume / max) : 0.22;
  return 0.95;
}

export type HeroSummary = { value: string; unit: string; caption: string };

// The number above the grid, over the same span the grid draws.
//
// THE WHOLE MONTH, NOT THE LAST SEVEN ENTRIES. It used to slice the final week
// off a rolling five week window. Against a month that slice means the last
// seven days OF THE MONTH, so early in the month it would report days that have
// not happened yet, and the card would describe a different span from the
// calendar directly beneath it.
//
// The denominator is the month's own length rather than a fixed number, or a
// 30 day month would offer a 31st day nobody could have trained on.
export function matrixHeroSummary(
  days: MatrixDay[],
  metric: MatrixMetric,
): HeroSummary {
  if (metric === "gym") {
    const n = days.filter((d) => d.trained).length;
    return {
      value: String(n),
      unit: `of ${days.length} days`,
      caption: "Training days this month",
    };
  }
  if (metric === "volume") {
    const v = days.reduce((a, d) => a + d.volume, 0);
    return { value: formatCompact(v), unit: "lbs", caption: "Total volume this month" };
  }
  const p = days.reduce((a, d) => a + d.prCount, 0);
  return {
    value: String(p),
    unit: p === 1 ? "new best" : "new bests",
    caption: "Personal records this month",
  };
}
