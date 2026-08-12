import { createClient } from "@/lib/supabase/server";
import { setVolume } from "@/lib/progress/strength";
import { dateKeyInZone } from "@/lib/progress/matrix";
import type { SetRow, SessionRow } from "@/lib/export/columns";

type RawSet = {
  set_number: number;
  reps: number;
  weight: number;
  rir_low: number | null;
  rir_high: number | null;
  exercise: { name: string } | null;
};

type RawSession = {
  completed_at: string | null;
  routines: { name: string } | null;
  workout_sets: RawSet[] | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Postgres here does not know the user's timezone, so the query is bounded a
// day wide on each side and the exact day comparison happens below. That keeps
// the fetch bounded without doing timezone arithmetic in SQL.
function bounds(startDate: string, endDate: string) {
  const from = new Date(`${startDate}T00:00:00Z`).getTime() - DAY_MS;
  const to = new Date(`${endDate}T00:00:00Z`).getTime() + 2 * DAY_MS;
  return { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
}

async function fetchSessions(startDate: string, endDate: string): Promise<RawSession[]> {
  const supabase = await createClient();
  const { from, to } = bounds(startDate, endDate);
  const { data } = await supabase
    .from("workout_sessions")
    .select(
      "completed_at, routines(name), workout_sets(set_number, reps, weight, rir_low, rir_high, exercise:exercises(name))",
    )
    .not("completed_at", "is", null)
    .gte("completed_at", from)
    .lte("completed_at", to)
    .order("completed_at", { ascending: true });
  return (data ?? []) as unknown as RawSession[];
}

// YYYY-MM-DD compares correctly as a string, so the range test is a plain
// lexicographic comparison once both ends are in the same zone.
function inRange(iso: string, startDate: string, endDate: string, timeZone: string): boolean {
  const key = dateKeyInZone(iso, timeZone);
  return key >= startDate && key <= endDate;
}

export async function getSetRows(
  startDate: string,
  endDate: string,
  timeZone: string,
): Promise<SetRow[]> {
  const sessions = await fetchSessions(startDate, endDate);
  const rows: SetRow[] = [];
  for (const session of sessions) {
    if (!session.completed_at) continue;
    if (!inRange(session.completed_at, startDate, endDate, timeZone)) continue;
    for (const set of session.workout_sets ?? []) {
      rows.push({
        date: session.completed_at,
        routineName: session.routines?.name ?? "Routine",
        exerciseName: set.exercise?.name ?? "Exercise",
        setNumber: set.set_number,
        reps: set.reps,
        weight: set.weight,
        rirLow: set.rir_low,
        rirHigh: set.rir_high,
      });
    }
  }
  return rows;
}

export async function getSessionRows(
  startDate: string,
  endDate: string,
  timeZone: string,
): Promise<SessionRow[]> {
  const sessions = await fetchSessions(startDate, endDate);
  const rows: SessionRow[] = [];
  for (const session of sessions) {
    if (!session.completed_at) continue;
    if (!inRange(session.completed_at, startDate, endDate, timeZone)) continue;
    const sets = session.workout_sets ?? [];
    rows.push({
      date: session.completed_at,
      routineName: session.routines?.name ?? "Routine",
      totalSets: sets.length,
      totalVolume: sets.reduce((sum, s) => sum + setVolume(s.weight, s.reps), 0),
    });
  }
  return rows;
}
