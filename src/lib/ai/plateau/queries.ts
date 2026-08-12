import { createClient } from "@/lib/supabase/server";
import { WINDOW } from "@/lib/progress/trend";

export type PlateauSessionRow = {
  completedAt: string;
  sets: {
    reps: number;
    weight: number;
    rir_low: number | null;
    rir_high: number | null;
  }[];
};

export type PlateauData = {
  exerciseName: string;
  muscleGroup: string | null;
  restSeconds: number;
  sessions: PlateauSessionRow[];
};

// RLS scopes every read to the caller. The sessions come back newest first
// from the query and are reversed here, so callers always see oldest first,
// the order both the detector and the prompt expect.
export async function getPlateauData(
  exerciseId: string,
): Promise<PlateauData | null> {
  const supabase = await createClient();

  const { data: exercise } = await supabase
    .from("exercises")
    .select("name, muscle_group")
    .eq("id", exerciseId)
    .maybeSingle();
  if (!exercise) return null;

  const { data: settings } = await supabase
    .from("user_settings")
    .select("rest_timer_seconds")
    .maybeSingle();

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select(
      "completed_at, workout_sets!inner(reps, weight, rir_low, rir_high, exercise_id)",
    )
    .not("completed_at", "is", null)
    .eq("workout_sets.exercise_id", exerciseId)
    .order("completed_at", { ascending: false })
    .limit(WINDOW);

  const rows = (sessions ?? [])
    .filter((s) => s.completed_at)
    .map((s) => ({
      completedAt: s.completed_at as string,
      sets: (s.workout_sets ?? []).map((st) => ({
        reps: st.reps,
        weight: st.weight,
        rir_low: st.rir_low,
        rir_high: st.rir_high,
      })),
    }))
    .reverse();

  return {
    exerciseName: exercise.name,
    muscleGroup: exercise.muscle_group,
    restSeconds: settings?.rest_timer_seconds ?? 120,
    sessions: rows,
  };
}
