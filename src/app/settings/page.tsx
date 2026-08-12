import { createClient } from "@/lib/supabase/server";
import { getNotificationSettings } from "@/lib/notifications/queries";
import { getAiQuickEntry } from "@/lib/ai/queries";
import { NotificationSettings } from "@/components/NotificationSettings";
import { AiQuickEntryToggle } from "@/components/AiQuickEntryToggle";
import { ExportPanel } from "@/components/ExportPanel";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemePicker } from "@/components/ThemePicker";
import { AppearanceControl } from "@/components/AppearanceControl";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const settings = await getNotificationSettings();
  const aiQuickEntry = await getAiQuickEntry();

  return (
    <main className="px-5 pt-12 pb-24">
      <h1
        className="text-[26px] font-semibold"
        style={{ fontFamily: "var(--font-spectral)", color: "var(--text)" }}
      >
        Settings
      </h1>
      <p style={{ color: "var(--text-dim)" }} className="mt-2 mb-8">
        Signed in as {user?.email ?? "unknown"}
      </p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Appearance</h2>
        <AppearanceControl />
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Theme</h2>
        <ThemePicker />
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">AI</h2>
        <AiQuickEntryToggle initial={aiQuickEntry} />
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Export</h2>
        <ExportPanel />
      </section>

      <NotificationSettings initial={settings} />

      <div className="mt-8">
        <SignOutButton />
      </div>
    </main>
  );
}
