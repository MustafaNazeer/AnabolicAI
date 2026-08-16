"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/user";

// Writes a day and sets its labels to exactly the ones passed.
//
// THE NORMAL CLIENT, NOT THE SERVICE ROLE, and that is the difference from
// setWeekPlanner beside it. These tables carry ordinary grants and their RLS
// policies scope every row to its owner, so the caller writing their own day is
// exactly what the policy already allows. The gate needed the service role only
// because its column is deliberately ungranted.
//
// UPSERT ON (user_id, day), because one row per day is what replacing a plan
// means. Saving the same day twice must land on the same row, not create a
// second one the unique constraint would then reject.
//
// THE LABELS ARE CLEARED FIRST, not merged. Changing a day from cardio to arms
// has to leave arms alone on it; a plain insert would leave the day reading as
// both and quietly inflate the weekly balance.
export async function savePlannerDay(
  day: string,
  categoryIds: string[],
  done: boolean,
): Promise<{ ok: true } | { error: string }> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planner_days")
    .upsert(
      { user_id: user.id, day, done, updated_at: new Date().toISOString() },
      { onConflict: "user_id,day" },
    )
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not save that day." };

  const del = await supabase.from("planner_day_categories").delete().eq("day_id", data.id);
  if (del.error) return { error: del.error.message };

  // Guarded rather than unconditional. Clearing every label off a day is a real
  // thing to do, and PostgREST answers an insert of an empty array with a 400,
  // so the save would report an error it did not have.
  if (categoryIds.length > 0) {
    const ins = await supabase
      .from("planner_day_categories")
      .insert(categoryIds.map((category_id) => ({ day_id: data.id, category_id })));
    if (ins.error) return { error: ins.error.message };
  }

  revalidatePath("/");
  return { ok: true };
}
