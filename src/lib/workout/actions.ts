"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { celebrateIfPr } from "@/lib/notifications/pr";
import { evaluateGoalOnLog } from "@/lib/notifications/goal";

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
  id: string,
  exerciseId: string,
  setNumber: number,
  reps: number,
  weight: number,
  rir: number,
) {
  // retryable:false marks input that can never succeed, so the sync engine
  // drops it instead of retrying forever. Server errors below are retryable so
  // a queued set is never silently lost to an auth/RLS/transient failure.
  if (!Number.isFinite(reps) || reps < 1)
    return { error: "Reps must be at least 1.", retryable: false };
  if (!Number.isFinite(weight) || weight < 0)
    return { error: "Weight cannot be negative.", retryable: false };
  if (!Number.isInteger(rir) || rir < 0 || rir > 5)
    return { error: "RIR must be 0 to 5.", retryable: false };

  const supabase = await createClient();
  // Upsert on the client-generated id so replaying a queued offline op can
  // never double-insert. ignoreDuplicates returns no row for a replay, so the
  // PR celebration below only fires on a genuinely new set.
  const { data, error } = await supabase
    .from("workout_sets")
    .upsert(
      {
        id,
        session_id: sessionId,
        exercise_id: exerciseId,
        set_number: setNumber,
        reps,
        weight,
        rir,
      },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) return { error: error.message, retryable: true };
  revalidatePath(`/log/${sessionId}`);
  if (data && data.length > 0) {
    try {
      await celebrateIfPr(exerciseId, reps, weight);
    } catch {
      // A push failure must never break logging.
    }
  }
  try {
    await evaluateGoalOnLog(exerciseId);
  } catch {
    // Goal evaluation must never break logging.
  }
  return { ok: true };
}

export async function deleteSet(setId: string, sessionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("workout_sets").delete().eq("id", setId);
  revalidatePath(`/log/${sessionId}`);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function finishSession(sessionId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workout_sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { ok: true };
}
