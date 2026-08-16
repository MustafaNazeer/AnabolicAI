import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { PushPayload } from "@/lib/notifications/payloads";

// The VAPID sub claim identifies the sender to the push service. It is not
// required to resolve or to match the request origin, but it should track the
// canonical origin for correctness. Changing this string does not invalidate
// any subscription. Only changing the VAPID key pair does. Moving the app to a
// new domain does not invalidate the old subscriptions either: it creates
// separate ones at the new origin, and stale rows are pruned on 410 below.
export const VAPID_SUBJECT = "https://anabolicai.app";

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);
  configured = true;
  return true;
}

type SubRow = { endpoint: string; p256dh: string; auth: string };

export async function sendToUserWith(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureConfigured()) return;

  const { data } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  const subs = (data ?? []) as SubRow[];
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", s.endpoint);
        }
      }
    }),
  );
}

export async function sendToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  const supabase = await createClient();
  await sendToUserWith(supabase, userId, payload);
}
