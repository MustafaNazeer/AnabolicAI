/** Matches shouldSendPr and shouldSendGoal in gate.ts. */
export function shouldSendRestPush(settings: {
  notif_master: boolean;
  notif_rest_push: boolean;
}): boolean {
  return settings.notif_master && settings.notif_rest_push;
}

/**
 * Whether a delivered message still describes the rest the user is in.
 *
 * This is the single rule that makes cancellation unnecessary. Reset, restart,
 * pause, finishing the workout and closing the app all either clear the token
 * or replace it, so a stale message fails here rather than needing to be
 * recalled from the scheduler.
 */
export function isRestLive(
  session: { completed_at: string | null; rest_token: string | null } | null,
  token: string,
): boolean {
  if (!session) return false;
  if (session.completed_at !== null) return false;
  if (!session.rest_token || !token) return false;
  return session.rest_token === token;
}

/**
 * QStash's publishJSON takes notBefore as a Unix timestamp in SECONDS.
 *
 * The PublishResponse type in the same package documents notBefore in
 * MILLISECONDS, which is a live inconsistency in the SDK. Passing milliseconds
 * here schedules the message about fifty years out, and the failure is
 * completely silent: the publish succeeds and the push never arrives. The
 * guard exists because that is not a failure any test of the happy path
 * would catch.
 */
export function toNotBeforeSeconds(deadlineMs: number): number {
  if (!Number.isFinite(deadlineMs) || deadlineMs < 1e12) {
    throw new Error("Expected a millisecond timestamp");
  }
  return Math.floor(deadlineMs / 1000);
}
