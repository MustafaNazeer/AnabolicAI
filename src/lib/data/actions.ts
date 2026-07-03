"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { copyRoutineName } from "@/lib/routines/duplicate";
import type { Exercise } from "@/lib/data/types";

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
    await supabase.from("routine_exercises").insert(rows);
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
  muscleGroup: string | null,
): Promise<{ error?: string; exercise?: Exercise }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Enter an exercise name." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      user_id: user.id,
      name: trimmed,
      muscle_group: muscleGroup?.trim() || null,
      is_default: false,
    })
    .select("id, name, muscle_group, is_default")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create exercise." };
  }
  return { exercise: data as Exercise };
}
