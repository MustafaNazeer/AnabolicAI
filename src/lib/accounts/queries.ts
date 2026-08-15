import { createClient } from "@/lib/supabase/server";

// RLS scopes user_settings to the caller, matching getAiQuickEntry. A missing
// row reads as not approved, the same convention canUseAi uses.
export async function getApproved(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("approved")
    .maybeSingle();
  return data?.approved ?? false;
}
