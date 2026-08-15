import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Whether this is the first landing this account has ever completed.
//
// Neither of the two signup paths can answer that on its own. Both re-execute
// on every subsequent sign in for as long as the account stays unapproved, and
// approved alone cannot tell a first landing from a later one: it reads false
// in both. signup_seen is the persisted marker that can, and this update both
// claims it and answers whether the claim was this call's, in one atomic
// statement, so two concurrent callbacks for the same account cannot both read
// as the first.
//
// The service role is required rather than convenient: the migration revokes
// UPDATE on this column from the authenticated role.
//
// Two callers ask this question for two reasons. The OAuth callback and the
// password path gate their auto approval on it, so an email on ALLOWED_EMAILS
// is approved when it first arrives and never re-approved afterwards, which is
// what keeps a revoke from being silently undone by the next sign in.
// notifyAdminsOfSignup asks it so a still pending account announces itself
// once rather than on every login. The two are mutually exclusive on both
// paths, an allowlisted signup approving itself and staying silent, so the
// marker is claimed exactly once per landing.
//
// Anything other than a claimed row reads as not the first landing. A failed
// or unreadable update must never be mistaken for a claim, because the caller
// turns that answer into an approval. Failure never propagates either: this
// runs inside the signup paths, where an error would turn a successful signup
// into an error page, and createAdminClient throws synchronously when the
// service role key is unset. Logged rather than silent, matching markApproved,
// so a broken key is distinguishable from an account that had simply landed
// before.
export async function claimSignupSeen(userId: string): Promise<boolean> {
  try {
    const { data } = await createAdminClient()
      .from("user_settings")
      .update({ signup_seen: true })
      .eq("user_id", userId)
      .eq("signup_seen", false)
      .select("user_id");
    return (data?.length ?? 0) > 0;
  } catch (err) {
    console.error("claimSignupSeen threw", { userId, err });
    return false;
  }
}
