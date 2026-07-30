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
  rirLow: number | null,
  rirHigh: number | null,
) {
  // retryable:false marks input that can never succeed, so the sync engine
  // drops it instead of retrying forever. Server errors below are retryable so
  // a queued set is never silently lost to an auth/RLS/transient failure.
  if (!Number.isFinite(reps) || reps < 1)
    return { error: "Reps must be at least 1.", retryable: false };
  if (!Number.isFinite(weight) || weight < 0)
    return { error: "Weight cannot be negative.", retryable: false };
  if (rirLow !== null && (!Number.isInteger(rirLow) || rirLow < 0 || rirLow > 5))
    return { error: "RIR must be 0 to 5.", retryable: false };
  if (
    rirHigh !== null &&
    (!Number.isInteger(rirHigh) || rirHigh < 0 || rirHigh > 5)
  )
    return { error: "RIR must be 0 to 5.", retryable: false };
  if (rirLow !== null && rirHigh !== null && rirLow > rirHigh)
    return { error: "RIR range must go from low to high.", retryable: false };
  if ((rirLow === null) !== (rirHigh === null))
    return { error: "RIR needs both ends or neither.", retryable: false };

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
        rir_low: rirLow,
        rir_high: rirHigh,
        // rir is still NOT NULL until migration 0006 drops it. Written and
        // never read; the fallback only matters for a set logged with no RIR.
        rir: rirLow ?? 2,
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
    try {
      await evaluateGoalOnLog(exerciseId);
    } catch {
      // Goal evaluation must never break logging.
    }
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

export async function swapExercise(
  sessionId: string,
  originalExerciseId: string,
  replacementExerciseId: string,
) {
  // Same retryable contract as logSet: false means the input can never succeed
  // and the sync engine should drop it, true means retry.
  if (originalExerciseId === replacementExerciseId) {
    return { error: "That is already the exercise.", retryable: false };
  }

  const supabase = await createClient();

  // Refuse a replacement already present in this session. Two cards for one
  // exercise would compute colliding set numbers, since set numbering is
  // derived per exercise from the logged sets.
  const { data: session } = await supabase
    .from("workout_sessions")
    .select("routine_id")
    .eq("id", sessionId)
    .single();
  if (!session) return { error: "Workout not found.", retryable: false };

  const { data: inRoutine } = await supabase
    .from("routine_exercises")
    .select("exercise_id")
    .eq("routine_id", (session as unknown as { routine_id: string }).routine_id);

  const { data: swapped } = await supabase
    .from("session_exercise_swaps")
    .select("original_exercise_id, replacement_exercise_id")
    .eq("session_id", sessionId);

  const present = new Set<string>();
  for (const r of (inRoutine ?? []) as { exercise_id: string }[]) {
    present.add(r.exercise_id);
  }
  for (const s of (swapped ?? []) as {
    original_exercise_id: string;
    replacement_exercise_id: string;
  }[]) {
    present.delete(s.original_exercise_id);
    present.add(s.replacement_exercise_id);
  }
  present.delete(originalExerciseId);

  if (present.has(replacementExerciseId)) {
    return { error: "That exercise is already in this workout.", retryable: false };
  }

  const { error } = await supabase.from("session_exercise_swaps").upsert(
    {
      session_id: sessionId,
      original_exercise_id: originalExerciseId,
      replacement_exercise_id: replacementExerciseId,
    },
    { onConflict: "session_id,original_exercise_id" },
  );
  if (error) return { error: error.message, retryable: true };
  revalidatePath(`/log/${sessionId}`);
  return { ok: true };
}

export async function undoSwap(sessionId: string, originalExerciseId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("session_exercise_swaps")
    .delete()
    .eq("session_id", sessionId)
    .eq("original_exercise_id", originalExerciseId);
  if (error) return { error: error.message, retryable: true };
  revalidatePath(`/log/${sessionId}`);
  return { ok: true };
}

// Deletes the session outright. Its sets go with it through the cascade on
// workout_sets.session_id. This exists so a stale workout can be cleared
// without finishing it, which would otherwise record a phantom workout in the
// dashboard count, the streak and the weekly recap.
export async function discardSession(sessionId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/log");
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
