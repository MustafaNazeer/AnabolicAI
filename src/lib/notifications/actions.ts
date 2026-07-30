"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, ...values }, { onConflict: "user_id" });
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}
