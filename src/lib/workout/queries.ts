import { createClient } from "@/lib/supabase/server";
import type { Exercise } from "@/lib/data/types";
import type { LastSet, SessionDetail, SessionExercise } from "@/lib/workout/types";
import type { Swap } from "@/lib/workout/swap";

export async function getActiveSession(): Promise<{ id: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_sessions")
    .select("id")
    .is("completed_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? { id: data.id } : null;
}

export async function getSessionDetail(
  sessionId: string,
): Promise<SessionDetail | null> {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, routine_id, started_at, routines(name)")
    .eq("id", sessionId)
    .single();
  if (!session) return null;

  const routineName =
    (session as unknown as { routines: { name: string } | null }).routines?.name ??
    "Workout";
  const routineId = (session as unknown as { routine_id: string }).routine_id;

  const { data: rxRaw } = await supabase
    .from("routine_exercises")
    .select(
      "exercise_id, order_index, default_sets, exercise:exercises(id, name, muscle_group, is_default)",
    )
    .eq("routine_id", routineId)
    .order("order_index", { ascending: true });

  const { data: setsRaw } = await supabase
    .from("workout_sets")
    .select("id, exercise_id, set_number, reps, weight, rir_low, rir_high, logged_at")
    .eq("session_id", sessionId)
    .order("set_number", { ascending: true });

  const { data: swapsRaw } = await supabase
    .from("session_exercise_swaps")
    .select("original_exercise_id, replacement_exercise_id")
    .eq("session_id", sessionId);

  const swaps: Swap[] = (
    (swapsRaw ?? []) as {
      original_exercise_id: string;
      replacement_exercise_id: string;
    }[]
  ).map((r) => ({
    originalExerciseId: r.original_exercise_id,
    replacementExerciseId: r.replacement_exercise_id,
  }));

  const rx = (rxRaw ?? []) as unknown as {
    exercise_id: string;
    default_sets: number;
    exercise: Exercise;
  }[];
  // The database row shape, snake case, before it is mapped onto LoggedSet.
  const sets = (setsRaw ?? []) as unknown as {
    id: string;
    exercise_id: string;
    set_number: number;
    reps: number;
    weight: number;
    rir_low: number | null;
    rir_high: number | null;
    logged_at: string;
  }[];

  const exercises: SessionExercise[] = rx.map((r) => ({
    exercise: r.exercise,
    defaultSets: r.default_sets,
    loggedSets: sets
      .filter((s) => s.exercise_id === r.exercise_id)
      .map(({ id, set_number, reps, weight, rir_low, rir_high }) => ({
        id,
        set_number,
        reps,
        weight,
        rirLow: rir_low,
        rirHigh: rir_high,
      })),
  }));

  return {
    id: session.id,
    routineName,
    startedAt: (session as unknown as { started_at: string }).started_at,
    exercises,
    swaps,
    setTimes: sets.map((s) => s.logged_at),
  };
}

export async function getExerciseLibrary(): Promise<Exercise[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, is_default")
    .order("name", { ascending: true });
  return (data ?? []) as Exercise[];
}

export async function getLastSets(
  exerciseId: string,
  excludeSessionId: string,
): Promise<LastSet[]> {
  const supabase = await createClient();

  const { data: latest } = await supabase
    .from("workout_sets")
    .select("session_id")
    .eq("exercise_id", exerciseId)
    .neq("session_id", excludeSessionId)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return [];

  const { data } = await supabase
    .from("workout_sets")
    .select("set_number, reps, weight, rir_low, rir_high")
    .eq("exercise_id", exerciseId)
    .eq("session_id", latest.session_id)
    .order("set_number", { ascending: true });

  const rows = (data ?? []) as unknown as {
    set_number: number;
    reps: number;
    weight: number;
    rir_low: number | null;
    rir_high: number | null;
  }[];

  return rows.map(({ set_number, reps, weight, rir_low, rir_high }) => ({
    set_number,
    reps,
    weight,
    rirLow: rir_low,
    rirHigh: rir_high,
  }));
}
