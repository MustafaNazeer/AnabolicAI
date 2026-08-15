import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/auth/user";
import { isAdminEmail } from "@/lib/accounts/approval";
import { listAccounts } from "@/lib/accounts/admin";
import { AccountList } from "@/components/AccountList";

// A non admin visitor is redirected rather than shown an empty screen, so
// this page never confirms even its own existence to someone it refuses.
export default async function AccountsPage() {
  const user = await getVerifiedUser();
  if (!isAdminEmail(user?.email ?? null, process.env.ADMIN_EMAILS)) {
    redirect("/settings");
  }
  const accounts = await listAccounts();
  return (
    <main className="px-5 pt-12 pb-24">
      <h1
        className="text-[26px] font-semibold"
        style={{ fontFamily: "var(--font-spectral)", color: "var(--text)" }}
      >
        Accounts
      </h1>
      <AccountList accounts={accounts} />
    </main>
  );
}
