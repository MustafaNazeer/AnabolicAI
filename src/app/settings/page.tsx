import { createClient } from "@/lib/supabase/server";
import { getNotificationSettings } from "@/lib/notifications/queries";
import { NotificationSettings } from "@/components/NotificationSettings";
import { SignOutButton } from "@/components/SignOutButton";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const settings = await getNotificationSettings();

  return (
    <main className="px-5 pt-12 pb-24">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p style={{ color: "var(--text-dim)" }} className="mt-2 mb-8">
        Signed in as {user?.email ?? "unknown"}
      </p>

      <NotificationSettings initial={settings} />

      <div className="mt-8">
        <SignOutButton />
      </div>
    </main>
  );
}
