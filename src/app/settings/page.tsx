import Link from "next/link";
import { getVerifiedUser } from "@/lib/auth/user";
import { getNotificationSettings } from "@/lib/notifications/queries";
import { getAiQuickEntry, getAiPlateau, getAiInsights } from "@/lib/ai/queries";
import { getApproved } from "@/lib/accounts/queries";
import { isAdminEmail } from "@/lib/accounts/approval";
import { getUntaggedCustomExercises } from "@/lib/data/queries";
import { getWeekPlanner } from "@/lib/planner/queries";
import { NotificationSettings } from "@/components/NotificationSettings";
import { AiSettings } from "@/components/AiSettings";
import { UntaggedExercises } from "@/components/UntaggedExercises";
import { ExportPanel } from "@/components/ExportPanel";
import { SettingsSection } from "@/components/ui/SettingsSection";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemePicker } from "@/components/ThemePicker";
import { AppearanceControl } from "@/components/AppearanceControl";
import { WeekPlannerToggle } from "@/components/WeekPlannerToggle";

export default async function SettingsPage() {
  const user = await getVerifiedUser();
  const settings = await getNotificationSettings();
  const aiQuickEntry = await getAiQuickEntry();
  const aiPlateau = await getAiPlateau();
  const aiInsights = await getAiInsights();
  const approved = await getApproved();
  const untagged = await getUntaggedCustomExercises();
  const admin = isAdminEmail(user?.email ?? null, process.env.ADMIN_EMAILS);
  // Read only when it can be rendered. The switch is admin only, so fetching
  // the flag for everyone else would add a round trip to every settings load
  // for a control they never see.
  const weekPlanner = admin ? await getWeekPlanner() : false;

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

      {/*
        This section renders whether or not the features are shown elsewhere,
        and that is deliberate. It holds the switch that brings them back, so
        hiding it along with the surfaces would hide the switch's own undo and
        strand anyone who later wants just one of the three again.
      */}
      <SettingsSection title="AI">
        <AiSettings
          visible={aiQuickEntry.visible}
          quickEntry={aiQuickEntry.enabled}
          plateau={aiPlateau.enabled}
          insights={aiInsights.enabled}
          approved={approved}
        />
      </SettingsSection>

      {admin ? (
        <>
          <SettingsSection title="Accounts">
            <Link href="/settings/accounts" style={{ color: "var(--accent)" }}>
              Review accounts
            </Link>
          </SettingsSection>

          {/*
            Admin only, like the section above it. The switch flips this
            account's own gate so the planner can be looked at on a real
            account. It is not what keeps anyone else out: setWeekPlanner
            checks admin identity itself, because hiding a control takes it off
            the screen and does not close the endpoint behind it.
          */}
          <SettingsSection title="Week planner">
            <WeekPlannerToggle initial={weekPlanner} />
          </SettingsSection>
        </>
      ) : null}

      <SettingsSection title="Your exercises">
        <UntaggedExercises initial={untagged} />
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
