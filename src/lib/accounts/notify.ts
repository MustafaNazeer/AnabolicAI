import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendToUserWith } from "@/lib/notifications/push";
import { newAccountPayload } from "@/lib/notifications/payloads";
import { shouldSendNewAccount } from "@/lib/notifications/gate";
import { isAdminEmail } from "@/lib/accounts/approval";

// Best effort by design. This runs inside the signup paths, and a
// notification that cannot be delivered must never turn a successful signup
// into an error. Logged rather than truly silent, matching markApproved, so
// a systematically broken push path is distinguishable from nobody having
// signed up.
//
// Fires once per account, not once per login. The branches that call this
// (signUp's uninvited path, and the OAuth callback's open signup path)
// re-execute on every subsequent attempt for as long as the account stays
// unapproved, and approved alone cannot tell a first landing apart from a
// later sign in: it is false in both. signup_notified is the persisted
// marker that can. The update below both claims it and answers whether this
// call is the first, in one atomic statement, so two concurrent callbacks
// for the same new account cannot both notify. Claiming happens before the
// admin roster is even read, so a repeat call returns immediately without
// touching listUsers or sendToUserWith at all.
//
// The claim happens before any push is attempted, on purpose. A transient
// push failure after a successful claim loses the announcement for that
// account for good, rather than retrying it. That is accepted: the account
// still shows up on /settings/accounts, which lists every pending account
// regardless, so this push is a convenience on top of that authoritative
// list rather than the only way the admin finds out. Not worth a retry
// queue for that.
export async function notifyAdminsOfSignup(
  userId: string,
  email: string,
): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: claimed } = await admin
      .from("user_settings")
      .update({ signup_notified: true })
      .eq("user_id", userId)
      .eq("signup_notified", false)
      .select("user_id");
    if (!claimed || claimed.length === 0) return;

    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const admins = (data?.users ?? []).filter((u) =>
      isAdminEmail(u.email ?? null, process.env.ADMIN_EMAILS),
    );

    for (const a of admins) {
      const { data: settings } = await admin
        .from("user_settings")
        .select("notif_master, notif_new_account")
        .eq("user_id", a.id)
        .maybeSingle();
      if (!settings || !shouldSendNewAccount(settings)) continue;
      await sendToUserWith(admin, a.id, newAccountPayload(email));
    }
  } catch (err) {
    console.error("notifyAdminsOfSignup threw", { userId, email, err });
  }
}
