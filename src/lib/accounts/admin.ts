import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type Account = {
  id: string;
  email: string;
  createdAt: string;
  approved: boolean;
};

// Emails live in auth.users, which PostgREST does not expose, so the admin API
// is the only way to read them. It is paginated: one page of 1000 covers this
// app by a wide margin, and the cost of this call is written down here because
// it stops being nothing at a few thousand accounts.
export async function listAccounts(): Promise<Account[]> {
  const admin = createAdminClient();
  const { data: users } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const { data: settings } = await admin
    .from("user_settings")
    .select("user_id, approved");

  const approvedBy = new Map(
    ((settings ?? []) as { user_id: string; approved: boolean }[]).map((s) => [
      s.user_id,
      s.approved,
    ]),
  );

  return (users?.users ?? [])
    .map((u) => ({
      id: u.id,
      email: u.email ?? "unknown",
      createdAt: u.created_at,
      // A user with no settings row reads as unapproved, matching canUseAi.
      approved: approvedBy.get(u.id) ?? false,
    }))
    // Unapproved first, because they are the only rows that need an action,
    // then newest first within each group.
    .sort((a, b) =>
      a.approved === b.approved
        ? b.createdAt.localeCompare(a.createdAt)
        : Number(a.approved) - Number(b.approved),
    );
}
