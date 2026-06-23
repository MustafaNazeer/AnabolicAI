import { startOfWeek } from "@/lib/progress/week";
import { zonedNow } from "@/lib/notifications/schedule";
import { dayKey, dateKeyInZone } from "@/lib/progress/matrix";

export type DayState = "rest" | "done" | "today" | "future";
export type WeekDay = { letter: string; state: DayState };

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export function weekStripDays(
  sessions: { completedAt: string }[],
  now: Date,
  timeZone: string,
): WeekDay[] {
  const today = zonedNow(now, timeZone);
  const monday = startOfWeek(today);
  const todayKey = dayKey(today);
  const trained = new Set(
    sessions.map((s) => dateKeyInZone(s.completedAt, timeZone)),
  );

  const out: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const key = dayKey(d);
    let state: DayState;
    if (key === todayKey) state = "today";
    else if (trained.has(key)) state = "done";
    else if (key > todayKey) state = "future";
    else state = "rest";
    out.push({ letter: LETTERS[i], state });
  }
  return out;
}
