import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendToUserWith } from "@/lib/notifications/push";
import { restCompletePayload } from "@/lib/notifications/payloads";
import { isRestLive, shouldSendRestPush } from "@/lib/notifications/restPush";

async function handler(request: Request) {
  const { sessionId, token } = (await request.json()) as {
    sessionId?: string;
    token?: string;
  };
  // Every early return below is a 200. A dropped message is a correct outcome,
  // and returning an error would make QStash retry a push we deliberately
  // suppressed.
  if (!sessionId || !token) return Response.json({ ok: true });

  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("user_id, completed_at, rest_token")
    .eq("id", sessionId)
    .maybeSingle();

  if (!isRestLive(session, token)) return Response.json({ ok: true });

  const userId = (session as { user_id: string }).user_id;

  const { data: settings } = await supabase
    .from("user_settings")
    .select("notif_master, notif_rest_push")
    .eq("user_id", userId)
    .maybeSingle();

  if (!settings || !shouldSendRestPush(settings)) {
    return Response.json({ ok: true });
  }

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
