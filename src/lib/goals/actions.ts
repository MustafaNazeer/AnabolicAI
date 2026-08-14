// src/lib/goals/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateGoalInput } from "@/lib/goals/validation";
import { getVerifiedUser } from "@/lib/auth/user";

export async function createGoal(
  exerciseId: string,
  targetWeight: number,
  targetReps: number,
) {
  const v = validateGoalInput(targetWeight, targetReps);
  if (v.error) return { error: v.error };

  const supabase = await createClient();
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    exercise_id: exerciseId,
    target_weight: targetWeight,
    target_reps: targetReps,
  });
  if (error) {
    if (error.code === "23505") {
      return { error: "You already have an active goal for this exercise." };
    }
    return { error: error.message };
  }
  revalidatePath("/progress");
  return { ok: true };
}

export async function updateGoal(
  goalId: string,
  targetWeight: number,
  targetReps: number,
) {
  const v = validateGoalInput(targetWeight, targetReps);
  if (v.error) return { error: v.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .update({
      target_weight: targetWeight,
      target_reps: targetReps,
      proximity_notified: false,
    })
    .eq("id", goalId);
  if (error) return { error: error.message };
  revalidatePath("/progress");
  return { ok: true };
}

export async function deleteGoal(goalId: string) {
  const supabase = await createClient();
  await supabase.from("goals").delete().eq("id", goalId);
  revalidatePath("/progress");
  return { ok: true };
}
