"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedUser } from "@/lib/auth/user";
import { isAdminEmail } from "@/lib/accounts/approval";

const NOT_ALLOWED = "Not allowed.";

// Turns the week planner on or off for the caller's own account.
//
// SERVICE ROLE, BECAUSE week_planner CARRIES NO GRANT. That is deliberate and
// it is the whole shape of this gate: 0018_ai_visible_grant.sql records that a
// column on user_settings is unwritable by authenticated unless granted
// explicitly, and this one is left ungranted on purpose so that the only path
// to setting it runs through an admin check. approved and signup_seen are the
// same, and ai_visible is the counterexample: it is granted because it is its
// owner's own preference.
//
// THE ADMIN CHECK IS INSIDE THE ACTION, not on the page that renders the
// switch. A server action is a public endpoint that anyone can post to, so a
// page level check protects the rendering and nothing else. This is the same
// reasoning, and the same failure mode, as callerIsAdmin in
// src/lib/accounts/actions.ts.
//
// NO userId PARAMETER, ON PURPOSE. The switch exists so an admin can see what
// a planner account sees, so it writes the caller's own row and nothing else.
// Any other account's flag is set out of band, which leaves this endpoint
// unable to touch another account rather than merely refusing to.
export async function setWeekPlanner(
  enabled: boolean,
): Promise<{ ok: true } | { error: string }> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_ALLOWED };
  if (!isAdminEmail(user.email ?? null, process.env.ADMIN_EMAILS)) {
    return { error: NOT_ALLOWED };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_settings")
    .update({ week_planner: enabled })
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  // Settings holds the switch, and the dashboard is where the planner surfaces
  // will live, so both are stale the moment this flips. Missing the second one
  // would leave the switch reporting a state the home screen does not show
  // until it happens to be reloaded.
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}
