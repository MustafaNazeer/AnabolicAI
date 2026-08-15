"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedUser } from "@/lib/auth/user";
import { isAdminEmail } from "@/lib/accounts/approval";

const NOT_ALLOWED = "Not allowed.";

// Checked inside every action rather than only on the page. These writes use
// the service role client, which bypasses RLS entirely, so the page level
// check protects the rendering and nothing else. A server action is a public
// endpoint that anyone can post to.
async function callerIsAdmin(): Promise<boolean> {
  const user = await getVerifiedUser();
  return isAdminEmail(user?.email ?? null, process.env.ADMIN_EMAILS);
}

async function setApproved(
  userId: string,
  approved: boolean,
): Promise<{ ok: true } | { error: string }> {
  if (!(await callerIsAdmin())) return { error: NOT_ALLOWED };

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_settings")
    .update({ approved })
    .eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/settings/accounts");
  return { ok: true };
}

export async function approveAccount(
  userId: string,
): Promise<{ ok: true } | { error: string }> {
  return setApproved(userId, true);
}

// Revoke deliberately leaves the three AI consent columns alone. The consent
// guards already refuse an unapproved account, so clearing them would only
// discard a preference its owner would have to set again if approved later.
export async function revokeAccount(
  userId: string,
): Promise<{ ok: true } | { error: string }> {
  return setApproved(userId, false);
}
