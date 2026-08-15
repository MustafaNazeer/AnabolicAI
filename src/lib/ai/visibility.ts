"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/user";

// Whether the AI features appear in the interface. Kept in its own file rather
// than added to one of the three feature action files, because it belongs to
// none of them: it governs all three at once and its column is not a consent
// column. See 0017_ai_visible.sql for why those are separate ideas.
//
// DELIBERATELY NOT GATED ON APPROVAL, which is the one way it differs from the
// three consent actions beside it. Those refuse an unapproved account because
// turning one on authorises spending money at Anthropic. This spends nothing,
// and an unapproved account is exactly the one most likely to want three
// features it is not allowed to use out of its way. Gating it would also be
// perverse, since the lock notice it would raise sits on the very rows this
// switch exists to remove.
export async function setAiVisible(
  visible: boolean,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, ai_visible: visible }, { onConflict: "user_id" });
  if (error) return { error: error.message };

  // One route per surface, plus the one holding the switch. The three features
  // render on three different screens, so missing any of these leaves a hidden
  // feature on display until that page is reloaded by hand. The in progress
  // workout screen is not listed because it is a dynamic route rendered per
  // session and is never served from the cache.
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/progress");
  return { ok: true };
}
