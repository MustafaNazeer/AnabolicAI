"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/user";

export async function saveSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const supabase = await createClient();
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
    { onConflict: "user_id,endpoint" },
  );
  if (error) return { error: error.message };
  return { ok: true };
}

export async function removeSubscription(endpoint: string) {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true };
}

export async function updateNotificationSettings(values: {
  notif_master: boolean;
  notif_rest_timer: boolean;
  notif_rest_push: boolean;
  notif_reminder: boolean;
  reminder_days: string | null;
  reminder_time: string | null;
  notif_streak: boolean;
  notif_pr: boolean;
  notif_weekly: boolean;
  notif_goal: boolean;
  notif_unfinished: boolean;
  rest_timer_seconds: number;
}) {
  const supabase = await createClient();
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

  // Named one by one rather than spread. This is a server action, so `values`
  // arrives over the wire and the type annotation above is erased before this
  // line runs. Spreading it put every column of user_settings within reach of a
  // crafted call carrying an extra key. The database refuses `approved` and
  // `signup_seen` through the column level revokes in 0014 and 0015, but that
  // is a backstop covering the two columns someone thought to name, and it is
  // not this function's job to rely on it.
  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      notif_master: values.notif_master,
      notif_rest_timer: values.notif_rest_timer,
      notif_rest_push: values.notif_rest_push,
      notif_reminder: values.notif_reminder,
      reminder_days: values.reminder_days,
      reminder_time: values.reminder_time,
      notif_streak: values.notif_streak,
      notif_pr: values.notif_pr,
      notif_weekly: values.notif_weekly,
      notif_goal: values.notif_goal,
      notif_unfinished: values.notif_unfinished,
      rest_timer_seconds: values.rest_timer_seconds,
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function reconcileSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const supabase = await createClient();
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

  // Only repair for someone who wants notifications. Storing a subscription
  // for a user who turned them off would be wrong even though every send gate
  // also checks notif_master.
  const { data: settings } = await supabase
    .from("user_settings")
    .select("notif_master")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!settings?.notif_master) return { skipped: true };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
    { onConflict: "user_id,endpoint" },
  );
  if (error) return { error: error.message };
  return { ok: true };
}
