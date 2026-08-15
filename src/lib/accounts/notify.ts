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
export async function notifyAdminsOfSignup(email: string): Promise<void> {
  try {
    const admin = createAdminClient();
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
    console.error("notifyAdminsOfSignup threw", { email, err });
  }
}
