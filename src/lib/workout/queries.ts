import { createClient } from "@/lib/supabase/server";
import type { Exercise } from "@/lib/data/types";
import type { LastSet, LoggedSet, SessionDetail, SessionExercise } from "@/lib/workout/types";

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
    .select("id, routine_id, routines(name)")
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
    .select("id, exercise_id, set_number, reps, weight, rir")
    .eq("session_id", sessionId)
    .order("set_number", { ascending: true });

  const rx = (rxRaw ?? []) as unknown as {
    exercise_id: string;
    default_sets: number;
    exercise: Exercise;
  }[];
  const sets = (setsRaw ?? []) as unknown as ({ exercise_id: string } & LoggedSet)[];

  const exercises: SessionExercise[] = rx.map((r) => ({
    exercise: r.exercise,
    defaultSets: r.default_sets,
    loggedSets: sets
      .filter((s) => s.exercise_id === r.exercise_id)
      .map(({ id, set_number, reps, weight, rir }) => ({
        id,
        set_number,
        reps,
        weight,
        rir,
      })),
  }));

  return { id: session.id, routineName, exercises };
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
    .select("set_number, reps, weight, rir")
    .eq("exercise_id", exerciseId)
    .eq("session_id", latest.session_id)
    .order("set_number", { ascending: true });

  return (data ?? []) as LastSet[];
}
