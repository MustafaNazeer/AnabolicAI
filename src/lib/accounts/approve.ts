import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// The service role is required rather than convenient: the migration revokes
// UPDATE on this column from the authenticated role, so the user's own client
// cannot perform this write by design.
//
// Failure never propagates, on purpose. This runs on the signup path, and a
// failed approval must not turn a successful signup into an error page or a
// 500 on an already signed in OAuth user. That covers both a PostgREST result
// error and a throw, which createAdminClient raises synchronously when the
// service role key is unset. The account simply lands unapproved and the
// admin can approve it by hand, which is the same state an uninvited signup
// reaches. Both failure shapes are logged rather than swallowed silently, so
// a systematically broken key is distinguishable from an admin who simply has
// not approved anyone yet.
export async function markApproved(userId: string): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from("user_settings")
      .update({ approved: true })
      .eq("user_id", userId);
    if (error) console.error("markApproved failed", { userId, error });
  } catch (err) {
    console.error("markApproved threw", { userId, err });
  }
}
