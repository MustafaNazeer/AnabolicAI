import { createClient } from "@/lib/supabase/server";
import { hasWeekPlanner } from "@/lib/planner/visibility";

// RLS scopes user_settings to the caller, matching getApproved beside it, and
// the column carries an explicit select grant from 0020 so this read works at
// all. See that migration for why reading is granted while writing is not.
//
// The decision is deliberately not made here. hasWeekPlanner holds it so it can
// be tested without a database, which leaves this function as nothing but the
// fetch, the layer this project does not unit test because mocking a database
// proves nothing about it.
export async function getWeekPlanner(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("week_planner")
    .maybeSingle();
  return hasWeekPlanner(data);
}
