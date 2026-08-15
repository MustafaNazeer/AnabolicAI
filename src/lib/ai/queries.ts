import { createClient } from "@/lib/supabase/server";

// What one AI feature's row says about itself: whether its owner has consented
// to it sending data, and whether the feature appears in the interface at all.
//
// The two are separate questions and separate columns. Consent is the privacy
// promise; visibility is decluttering. See 0017_ai_visible.sql for why
// collapsing them would be worse than carrying both.
export type AiSetting = { enabled: boolean; visible: boolean };

// Visibility rides each consent select rather than being read on its own. Every
// caller here was already selecting its own consent column before rendering, so
// adding ai_visible to that list is the same query, not another one. That
// matters on the dashboard in particular, where src/app/page.tsx records that
// awaiting a consent flag separately cost a round trip on every load, including
// for users who never turn the feature on. The open signup design made the same
// call for `approved`, for the same reason.
//
// Consent absent reads false and visibility absent reads true, and the
// asymmetry is deliberate: an unreadable consent flag must never authorise
// sending training data, while an unreadable visibility flag must never empty
// three screens and make the app look broken. Both match their column defaults.
function read(row: Record<string, unknown> | null, column: string): AiSetting {
  return {
    enabled: row?.[column] === true,
    visible: row?.ai_visible !== false,
  };
}

// RLS scopes user_settings to the caller, matching getNotificationSettings.
export async function getAiQuickEntry(): Promise<AiSetting> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("ai_quick_entry, ai_visible")
    .maybeSingle();
  return read(data, "ai_quick_entry");
}

// RLS scopes user_settings to the caller, matching getAiQuickEntry.
export async function getAiPlateau(): Promise<AiSetting> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("ai_plateau, ai_visible")
    .maybeSingle();
  return read(data, "ai_plateau");
}

// RLS scopes user_settings to the caller, matching getAiPlateau.
export async function getAiInsights(): Promise<AiSetting> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("ai_insights, ai_visible")
    .maybeSingle();
  return read(data, "ai_insights");
}
