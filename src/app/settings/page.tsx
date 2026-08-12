import { createClient } from "@/lib/supabase/server";
import { getNotificationSettings } from "@/lib/notifications/queries";
import { getAiQuickEntry, getAiPlateau } from "@/lib/ai/queries";
import { NotificationSettings } from "@/components/NotificationSettings";
import { AiQuickEntryToggle } from "@/components/AiQuickEntryToggle";
import { AiPlateauToggle } from "@/components/AiPlateauToggle";
import { ExportPanel } from "@/components/ExportPanel";
import { SettingsSection } from "@/components/ui/SettingsSection";
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
  const aiPlateau = await getAiPlateau();

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

      <SettingsSection title="Appearance">
        <AppearanceControl />
      </SettingsSection>

      <SettingsSection title="Theme">
        <ThemePicker />
      </SettingsSection>

      <SettingsSection title="Notifications">
        <NotificationSettings initial={settings} />
      </SettingsSection>

      <SettingsSection title="AI">
        <div className="flex flex-col gap-3">
          <AiQuickEntryToggle initial={aiQuickEntry} />
          <AiPlateauToggle initial={aiPlateau} />
        </div>
      </SettingsSection>

      <SettingsSection title="Export">
        <ExportPanel />
      </SettingsSection>

      <div className="mt-8">
        <SignOutButton />
      </div>
    </main>
  );
}
