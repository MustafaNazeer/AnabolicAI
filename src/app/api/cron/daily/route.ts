import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gatherUserSchedule } from "@/lib/notifications/cron";
import { sendToUserWith } from "@/lib/notifications/push";
import {
  workoutReminderPayload,
  streakWarningPayload,
  weeklyRecapPayload,
  unfinishedWorkoutPayload,
} from "@/lib/notifications/payloads";
import { lastActivityAt, isStale } from "@/lib/workout/stale";
import { resetDemoAccount, supabaseDemoDb } from "@/lib/demo/reset";
import {
  APP_TIMEZONE,
  zonedNow,
  dayNameInZone,
  isSundayInZone,
  shouldSendReminder,
  shouldWarnStreak,
  shouldSendWeeklyRecap,
  shouldNudgeUnfinished,
} from "@/lib/notifications/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SettingsRow = {
  user_id: string;
  notif_master: boolean;
  notif_reminder: boolean;
  notif_streak: boolean;
  notif_weekly: boolean;
  notif_unfinished: boolean;
  reminder_days: string | null;
};

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ?force=reminder|streak|weekly|unfinished bypasses the day gate for
  // end-to-end testing.
  const force = new URL(request.url).searchParams.get("force");

  const now = new Date();
  const zoned = zonedNow(now, APP_TIMEZONE);
  const dayName = dayNameInZone(now, APP_TIMEZONE);
  const isSunday = isSundayInZone(now, APP_TIMEZONE);

  const admin = createAdminClient();

  // Reseed the demo account before the notification pass, so the settings query
  // below already sees its notifications disabled.
  if (process.env.DEMO_EMAIL) {
    try {
      await resetDemoAccount(supabaseDemoDb(admin), process.env.DEMO_EMAIL, now);
    } catch {
      // A failed reseed must not stop the notification run. The next daily run
      // repairs it, because the reset is unconditional and idempotent.
    }
  }

  const { data } = await admin
    .from("user_settings")
    .select(
      "user_id, notif_master, notif_reminder, notif_streak, notif_weekly, notif_unfinished, reminder_days",
    )
    .eq("notif_master", true);
  const users = (data ?? []) as SettingsRow[];

  let sent = 0;
  for (const u of users) {
    try {
      const g = await gatherUserSchedule(admin, u.user_id, zoned);

      if (force === "reminder" || shouldSendReminder(u, dayName)) {
        await sendToUserWith(admin, u.user_id, workoutReminderPayload());
        sent++;
      }
      if (
        force === "streak" ||
        shouldWarnStreak(u, {
          isSunday,
          currentStreak: g.currentStreak,
          workoutsThisWeek: g.workoutsThisWeek,
        })
      ) {
        await sendToUserWith(
          admin,
          u.user_id,
          streakWarningPayload(Math.max(g.currentStreak, 1)),
        );
        sent++;
      }
      if (
        force === "weekly" ||
        shouldSendWeeklyRecap(u, {
          isSunday,
          workoutsThisWeek: g.workoutsThisWeek,
        })
      ) {
        await sendToUserWith(
          admin,
          u.user_id,
          weeklyRecapPayload(g.workoutsThisWeek, g.weeklyVolume),
        );
        sent++;
      }

      // Unfinished workout. Nudge once per session, claimed with a conditional
      // update so a concurrent run cannot send it twice.
      const { data: openRaw } = await admin
        .from("workout_sessions")
        .select(
          "id, started_at, unfinished_notified, routines(name), workout_sets(logged_at)",
        )
        .eq("user_id", u.user_id)
        .is("completed_at", null);

      const open = (openRaw ?? []) as unknown as {
        id: string;
        started_at: string;
        unfinished_notified: boolean;
        routines: { name: string } | null;
        workout_sets: { logged_at: string }[] | null;
      }[];

      for (const s of open) {
        const last = lastActivityAt(
          s.started_at,
          (s.workout_sets ?? []).map((w) => w.logged_at),
        );
        const send =
          force === "unfinished" ||
          shouldNudgeUnfinished(u, {
            isStale: isStale(last, now),
            alreadyNotified: s.unfinished_notified,
          });
        if (!send) continue;

        const { data: claimed } = await admin
          .from("workout_sessions")
          .update({ unfinished_notified: true })
          .eq("id", s.id)
          .eq("unfinished_notified", false)
          .select("id");
        if (!claimed || claimed.length === 0) continue;

        await sendToUserWith(
          admin,
          u.user_id,
          unfinishedWorkoutPayload(s.routines?.name ?? "Your workout", s.id),
        );
        sent++;
      }
    } catch {
      // One user's failure must not abort the batch.
    }
  }

  return NextResponse.json({ ok: true, users: users.length, sent });
}
