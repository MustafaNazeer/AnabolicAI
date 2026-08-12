import { createClient } from "@/lib/supabase/server";

// RLS scopes user_settings to the caller, matching getNotificationSettings.
export async function getAiQuickEntry(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("ai_quick_entry")
    .maybeSingle();
  return data?.ai_quick_entry ?? false;
}

// RLS scopes user_settings to the caller, matching getAiQuickEntry.
export async function getAiPlateau(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("ai_plateau")
    .maybeSingle();
  return data?.ai_plateau ?? false;
}
