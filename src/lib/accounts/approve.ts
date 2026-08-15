import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// The service role is required rather than convenient: the migration revokes
// UPDATE on this column from the authenticated role, so the user's own client
// cannot perform this write by design.
//
// Errors are swallowed on purpose. This runs on the signup path, and a failed
// approval must not turn a successful signup into an error page. The account
// simply lands unapproved and the admin can approve it by hand, which is the
// same state an uninvited signup reaches.
export async function markApproved(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("user_settings").update({ approved: true }).eq("user_id", userId);
}
