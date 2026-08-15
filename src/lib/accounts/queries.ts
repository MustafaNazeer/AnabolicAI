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

// RLS scopes user_settings to the caller, matching getApproved. A missing row
// reads as true, matching the column's own default and the sibling notif_*
// toggles in NOTIFICATION_DEFAULTS, unlike approved and the ai_* flags which
// default to false.
export async function getNotifNewAccount(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("notif_new_account")
    .maybeSingle();
  return data?.notif_new_account ?? true;
}
