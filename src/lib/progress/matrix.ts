import { setVolume, formatCompact } from "@/lib/progress/strength";
import { startOfWeek } from "@/lib/progress/week";
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

export function matrixWindow(now: Date, timeZone: string): string[] {
  const monday = startOfWeek(zonedNow(now, timeZone));
  const start = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() - 28,
  );
  const keys: string[] = [];
  for (let i = 0; i < 35; i++) {
    keys.push(
      dayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)),
    );
  }
  return keys;
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
  const keys = matrixWindow(now, timeZone);
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

export function matrixHeroSummary(
  days: MatrixDay[],
  metric: MatrixMetric,
): HeroSummary {
  const week = days.slice(-7);
  if (metric === "gym") {
    const n = week.filter((d) => d.trained).length;
    return { value: String(n), unit: "of 7 days", caption: "Training days, last 5 weeks" };
  }
  if (metric === "volume") {
    const v = week.reduce((a, d) => a + d.volume, 0);
    return { value: formatCompact(v), unit: "lbs", caption: "Daily volume, last 5 weeks" };
  }
  const p = week.reduce((a, d) => a + d.prCount, 0);
  return {
    value: String(p),
    unit: p === 1 ? "new best" : "new bests",
    caption: "Days with a PR, last 5 weeks",
  };
}
