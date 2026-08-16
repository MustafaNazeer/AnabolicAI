"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/user";
import { MAX_DISPLAY_NAME } from "@/lib/profile/name";

// Sets what the app calls the caller.
//
// THE NORMAL CLIENT, NOT THE SERVICE ROLE. 0022 grants update on this column
// precisely because it is the person's own name and carries no authority, which
// is the opposite of week_planner, whose write privilege is deliberately
// withheld so an admin action is the only path to it.
//
// NO userId PARAMETER, ON PURPOSE, and the RLS policy on user_settings already
// scopes an update to its owner. The action writes the caller's own row, so it
// cannot touch another account rather than merely refusing to.
//
// AN EMPTY NAME IS A REAL ANSWER AND IS STORED. Null means never asked and is
// what makes the prompt appear; writing "" is how declining is recorded, so the
// question is asked once rather than every time the app opens. That is why this
// does not reuse parseDisplayName, which refuses a blank on the way in from a
// field where blank means the person has not typed anything yet.
export async function setDisplayName(
  name: string,
): Promise<{ ok: true } | { error: string }> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

  const trimmed = name.trim();
  if (trimmed.length > MAX_DISPLAY_NAME) return { error: "That name is too long." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_settings")
    .update({ display_name: trimmed })
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  // The greeting is on the dashboard and the field to change it is in Settings,
  // so both are stale the moment this lands.
  revalidatePath("/");
  revalidatePath("/settings");
  return { ok: true };
}
