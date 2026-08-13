import { createClient } from "@/lib/supabase/server";

// Bounds the scan: five lifts of four sessions each fit comfortably inside
// the last thirty completed sessions, and a long history cannot balloon the
// read or the derivation.
export const SESSION_SCAN = 30;

export type InsightsSet = {
  exerciseId: string;
  reps: number;
  weight: number;
  rir_low: number | null;
  rir_high: number | null;
};

export type InsightsSessionRow = { completedAt: string; sets: InsightsSet[] };

export type ExerciseInfo = { name: string; muscleGroup: string | null };

export type InsightsData = {
  sessions: InsightsSessionRow[];
  exercises: Map<string, ExerciseInfo>;
};

// RLS scopes every read to the caller. The sessions come back newest first
// from the query and are reversed here, so callers always see oldest first,
// the order the detectors and the prompt expect. The action still sorts
// defensively; this is the courtesy, that is the guarantee.
export async function getInsightsData(): Promise<InsightsData> {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("completed_at, workout_sets(reps, weight, rir_low, rir_high, exercise_id)")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(SESSION_SCAN);

  const rows = (sessions ?? [])
    .filter((s) => s.completed_at)
    .map((s) => ({
      completedAt: s.completed_at as string,
      sets: (s.workout_sets ?? []).map((st) => ({
        exerciseId: st.exercise_id as string,
        reps: st.reps,
        weight: st.weight,
        rir_low: st.rir_low,
        rir_high: st.rir_high,
      })),
    }))
    .reverse();

  const ids = [...new Set(rows.flatMap((r) => r.sets.map((x) => x.exerciseId)))];
  const { data: exercises } = ids.length
    ? await supabase.from("exercises").select("id, name, muscle_group").in("id", ids)
    : { data: [] as { id: string; name: string; muscle_group: string | null }[] };

  const info = new Map(
    (exercises ?? []).map((e) => [
      e.id as string,
      { name: e.name as string, muscleGroup: e.muscle_group as string | null },
    ]),
  );

  return { sessions: rows, exercises: info };
}
