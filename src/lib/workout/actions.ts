"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { celebrateIfPr } from "@/lib/notifications/pr";

export async function startSession(routineId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: active } = await supabase
    .from("workout_sessions")
    .select("id")
    .is("completed_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (active) redirect(`/log/${active.id}`);

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({ user_id: user.id, routine_id: routineId })
    .select("id")
    .single();
  if (error || !data) redirect("/log");
  redirect(`/log/${data.id}`);
}

export async function logSet(
  sessionId: string,
  exerciseId: string,
  setNumber: number,
  reps: number,
  weight: number,
  rir: number,
) {
  if (!Number.isFinite(reps) || reps < 1) return { error: "Reps must be at least 1." };
  if (!Number.isFinite(weight) || weight < 0) return { error: "Weight cannot be negative." };
  if (!Number.isInteger(rir) || rir < 0 || rir > 5) return { error: "RIR must be 0 to 5." };

  const supabase = await createClient();
  const { error } = await supabase.from("workout_sets").insert({
    session_id: sessionId,
    exercise_id: exerciseId,
    set_number: setNumber,
    reps,
    weight,
    rir,
  });
  if (error) return { error: error.message };
  revalidatePath(`/log/${sessionId}`);
  try {
    await celebrateIfPr(exerciseId, reps, weight);
  } catch {
    // A push failure must never break logging.
  }
  return { ok: true };
}

export async function deleteSet(setId: string, sessionId: string) {
  const supabase = await createClient();
  await supabase.from("workout_sets").delete().eq("id", setId);
  revalidatePath(`/log/${sessionId}`);
}

export async function finishSession(sessionId: string) {
  const supabase = await createClient();
  await supabase
    .from("workout_sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", sessionId);
  revalidatePath("/");
  redirect("/");
}
