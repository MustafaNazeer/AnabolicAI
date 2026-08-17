import { startOfWeek } from "@/lib/progress/week";
import { zonedNow } from "@/lib/notifications/schedule";
import { dayKey } from "@/lib/progress/matrix";

export type PlannerDay = {
  day: string;
  done: boolean;
  categories: string[];
};

// Monday first, matching startOfWeek and matching how she writes her own week
// out. Reuses the dashboard's helpers rather than adding a second definition of
// what a week is, which is how the app would end up disagreeing with itself
// about which days are in it. monthWindow in progress/matrix.ts resolves its own
// span through zonedNow the same way, so this is the established composition
// rather than a new one.
export function plannerWeek(now: Date, timeZone: string): string[] {
  const monday = startOfWeek(zonedNow(now, timeZone));
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    out.push(
      dayKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)),
    );
  }
  return out;
}

// Counts by category across the week.
//
// ONLY DAYS WHERE done IS TRUE. A day she wrote ahead is a plan, and counting a
// plan would make the summary claim workouts that have not happened. Every
// category on a counted day adds one, so a day marked both lower body and abs
// shows in both, which is what allowing several labels per day means.
export function balanceCounts(days: PlannerDay[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of days) {
    if (!d.done) continue;
    for (const c of d.categories) out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}
