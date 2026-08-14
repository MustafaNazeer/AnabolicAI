"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { copyRoutineName } from "@/lib/routines/duplicate";
import type { Exercise } from "@/lib/data/types";
import { checkExerciseFields } from "@/lib/data/exerciseFields";

export async function createRoutine() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data, error } = await supabase
    .from("routines")
    .insert({ user_id: user.id, name: "New routine" })
    .select("id")
    .single();

  if (error || !data) redirect("/routines");
  redirect(`/routines/${data.id}`);
}

export async function deleteRoutine(id: string) {
  const supabase = await createClient();
  await supabase.from("routines").delete().eq("id", id);
  revalidatePath("/routines");
}

type SourceRoutine = {
  name: string;
  routine_exercises:
    | { exercise_id: string; order_index: number; default_sets: number }[]
    | null;
};

export async function duplicateRoutine(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data } = await supabase
    .from("routines")
    .select("name, routine_exercises(exercise_id, order_index, default_sets)")
    .eq("id", id)
    .single();
  if (!data) redirect("/routines");
  const source = data as unknown as SourceRoutine;

  const { data: created, error: createError } = await supabase
    .from("routines")
    .insert({ user_id: user.id, name: copyRoutineName(source.name) })
    .select("id")
    .single();
  if (createError || !created) redirect("/routines");

  const items = source.routine_exercises ?? [];
  if (items.length > 0) {
    const rows = items.map((it) => ({
      routine_id: created.id,
      exercise_id: it.exercise_id,
      order_index: it.order_index,
      default_sets: it.default_sets,
    }));
    const { error: itemsError } = await supabase
      .from("routine_exercises")
      .insert(rows);
    if (itemsError) {
      // Keep it all-or-nothing: drop the empty copy rather than leave a
      // phantom routine that looks like it lost its exercises.
      await supabase.from("routines").delete().eq("id", created.id);
      redirect("/routines");
    }
  }

  revalidatePath("/routines");
  redirect(`/routines/${created.id}`);
}

export async function saveRoutine(
  id: string,
  name: string,
  items: { exerciseId: string; defaultSets: number }[],
) {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Give the routine a name." };
  if (trimmed.length > 200) return { error: "Name is too long." };

  const supabase = await createClient();

  const { error: nameError } = await supabase
    .from("routines")
    .update({ name: trimmed })
    .eq("id", id);
  if (nameError) return { error: nameError.message };

  const { error: delError } = await supabase
    .from("routine_exercises")
    .delete()
    .eq("routine_id", id);
  if (delError) return { error: delError.message };

  if (items.length > 0) {
    const rows = items.map((it, i) => ({
      routine_id: id,
      exercise_id: it.exerciseId,
      order_index: i,
      default_sets: Math.max(1, it.defaultSets),
    }));
    const { error: insError } = await supabase
      .from("routine_exercises")
      .insert(rows);
    if (insError) return { error: insError.message };
  }

  revalidatePath(`/routines/${id}`);
  revalidatePath("/routines");
  return { ok: true };
}

export async function createExercise(
  name: string,
  muscleGroup: unknown,
  equipment: unknown,
): Promise<{ error?: string; exercise?: Exercise }> {
  // Validated before the client is even constructed. The chips constrain the
  // interface; this constrains the data, because a server action is a public
  // entry point and nothing stops a crafted call.
  const checked = checkExerciseFields(name, muscleGroup, equipment);
  if (!checked.ok) return { error: checked.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      user_id: user.id,
      name: checked.fields.name,
      muscle_group: checked.fields.muscleGroup,
      equipment: checked.fields.equipment,
      is_default: false,
    })
    .select("id, name, muscle_group, equipment, is_default")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create exercise." };
  }
  return { exercise: data as Exercise };
}
