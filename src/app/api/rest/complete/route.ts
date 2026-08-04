import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendToUserWith } from "@/lib/notifications/push";
import { restCompletePayload } from "@/lib/notifications/payloads";
import { isRestLive, shouldSendRestPush } from "@/lib/notifications/restPush";

// This endpoint always answers 200, including when it deliberately sends
// nothing, so its outcome is otherwise invisible in the logs. Every exit
// records which branch it took. No token or user id is logged, only the
// decision, because the point is to tell "dropped on purpose" apart from
// "should have sent and did not".
function outcome(reason: string, extra?: Record<string, unknown>) {
  console.log("rest-push:", reason, extra ? JSON.stringify(extra) : "");
  return Response.json({ ok: true });
}

async function handler(request: Request) {
  const { sessionId, token } = (await request.json()) as {
    sessionId?: string;
    token?: string;
  };
  // Every early return below is a 200. A dropped message is a correct outcome,
  // and returning an error would make QStash retry a push we deliberately
  // suppressed.
  if (!sessionId || !token) return outcome("no-body");

  const supabase = createAdminClient();

  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("user_id, completed_at, rest_token")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) return outcome("session-error", { m: sessionError.message });
  if (!session) return outcome("no-session");

  if (!isRestLive(session, token)) {
    return outcome("not-live", {
      completed: session.completed_at !== null,
      tokenMatches: session.rest_token === token,
      hasToken: Boolean(session.rest_token),
    });
  }

  const userId = (session as { user_id: string }).user_id;

  const { data: settings, error: settingsError } = await supabase
    .from("user_settings")
    .select("notif_master, notif_rest_push")
    .eq("user_id", userId)
    .maybeSingle();

  if (settingsError) return outcome("settings-error", { m: settingsError.message });
  if (!settings) return outcome("no-settings");
  if (!shouldSendRestPush(settings)) {
    return outcome("gated", {
      master: settings.notif_master,
      restPush: settings.notif_rest_push,
    });
  }

  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  console.log("rest-push: sending", JSON.stringify({ subscriptions: count }));

  await sendToUserWith(supabase, userId, restCompletePayload());

  // The rest is over, so clear it. This also makes a duplicate delivery a
  // no-op, since the token no longer matches.
  await supabase
    .from("workout_sessions")
    .update({ rest_ends_at: null, rest_token: null })
    .eq("id", sessionId);

  return Response.json({ ok: true });
}

// Without verification this route is a public endpoint for sending push
// notifications to any user, so it must never run unverified.
//
// The verifier is built PER REQUEST rather than at module scope, because
// verifySignatureAppRouter throws on construction when the signing keys are
// missing. The keys live only in Production and Preview, so building it at
// import time breaks `next build` during page data collection, where the
// module is loaded without them. Deferring it also means an unconfigured
// environment fails closed with a 503 instead of throwing.
//
// The keys carry the integration's STORAGE_ prefix, so the SDK's own defaults
// would find nothing and are passed explicitly.
export async function POST(request: Request): Promise<Response> {
  const currentSigningKey = process.env.STORAGE_QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.STORAGE_QSTASH_NEXT_SIGNING_KEY;
  if (!currentSigningKey || !nextSigningKey) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }
  const verified = verifySignatureAppRouter(handler, {
    currentSigningKey,
    nextSigningKey,
  });
  return verified(request);
}
