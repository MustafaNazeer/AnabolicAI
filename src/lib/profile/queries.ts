import { createClient } from "@/lib/supabase/server";

// RLS scopes user_settings to the caller, matching getWeekPlanner beside it,
// and the column carries an explicit select grant from 0022 so this read works
// at all.
//
// UNDEFINED AND NULL ARE NOT THE SAME HERE. Null is a row that exists with the
// column never written, which is what makes the prompt appear once. Undefined
// is no row at all, which the caller treats the same way through needsName.
export async function getDisplayName(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("display_name")
    .maybeSingle();
  return (data?.display_name as string | null | undefined) ?? null;
}
