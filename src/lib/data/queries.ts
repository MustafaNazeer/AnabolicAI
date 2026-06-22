import { createClient } from "@/lib/supabase/server";
import type {
  Exercise,
  Routine,
  RoutineDetail,
  RoutineItem,
} from "@/lib/data/types";

export async function getExercises(): Promise<Exercise[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, is_default")
    .order("muscle_group", { ascending: true })
    .order("name", { ascending: true });
  return (data ?? []) as Exercise[];
}

export async function getRoutines(): Promise<Routine[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("routines")
    .select("id, name")
    .order("updated_at", { ascending: false });
  return (data ?? []) as Routine[];
}

type RawRoutine = {
  id: string;
  name: string;
  routine_exercises: RoutineItem[] | null;
};

export async function getRoutine(id: string): Promise<RoutineDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("routines")
    .select(
      "id, name, routine_exercises(id, exercise_id, order_index, default_sets, exercise:exercises(id, name, muscle_group, is_default))",
    )
    .eq("id", id)
    .single();

  if (!data) return null;
  const row = data as unknown as RawRoutine;

  const items = (row.routine_exercises ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index);

  return { id: row.id, name: row.name, items };
}
