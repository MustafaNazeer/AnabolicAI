import { setVolume } from "@/lib/progress/strength";
import { startOfWeek } from "@/lib/progress/week";
import { zonedNow } from "@/lib/notifications/schedule";

export type MatrixMetric = "gym" | "volume" | "prs";

export type MatrixDay = {
  dateKey: string;
  trained: boolean;
  volume: number;
  prCount: number;
};

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
