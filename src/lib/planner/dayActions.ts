"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/user";
import { dayKey } from "@/lib/progress/matrix";
import { zonedNow, APP_TIMEZONE } from "@/lib/notifications/schedule";

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
// DONE IS DERIVED FROM THE DATE, NOT PASSED IN, and that is what let the second
// button go away. A day that has arrived is a workout; a day still to come is a
// plan. The interface was asking the user a question the calendar already
// answers, and two buttons meant a future day could be recorded as trained.
//
// Resolved in APP_TIMEZONE rather than UTC. At 02:00Z it is still the previous
// day in Chicago, so a UTC boundary would count tomorrow as arrived for five
// hours every night, which is exactly the claim the weekly balance must never
// make.
export async function savePlannerDay(
  day: string,
  categoryIds: string[],
): Promise<{ ok: true } | { error: string }> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

  const done = day <= dayKey(zonedNow(new Date(), APP_TIMEZONE));

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
