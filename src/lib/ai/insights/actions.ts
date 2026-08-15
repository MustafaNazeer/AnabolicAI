"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, limitMessage } from "@/lib/security/rateLimit";
import { estimatedOneRepMax } from "@/lib/progress/strength";
import { plateauStatus } from "@/lib/progress/plateau";
import { trendDirection, trendLabel, WINDOW } from "@/lib/progress/trend";
import { getDashboardData } from "@/lib/progress/queries";
import { getInsightsData, type InsightsSet } from "@/lib/ai/insights/queries";
import { buildInsightsMessage, type InsightLift } from "@/lib/ai/insights/prompt";
import { insightsWithModel } from "@/lib/ai/insights/suggest";
import { getVerifiedUser } from "@/lib/auth/user";
import { canUseAi } from "@/lib/accounts/approval";

export type InsightsResult =
  | { ok: true; insights: string[]; anyStalled: boolean }
  | { ok: false; error: string };

const UNAVAILABLE = "Insights are unavailable right now.";
const NO_DATA = "Log a few workouts first.";
const STALE = "No workouts in the last month. Log one and check back.";
const NO_INSIGHTS = "Could not come up with insights. Try again in a moment.";
const NOT_APPROVED = "This account is waiting to be approved.";

// The message is the billed side of this call. Five lifts of four sessions
// bound its size; the per session set cap is the plateau one, because a
// session can hold an unbounded number of sets.
const MAX_LIFTS = 5;
const MAX_SETS_PER_SESSION = 12;

// The scan is bounded by session count, not by age, so a dormant account's
// months old sessions still arrive and still clear the empty guard. Thirty
// days is deliberately looser than the button's "this week": someone back
// from a two week break has training worth commenting on, someone who last
// trained in the spring does not.
const STALE_AFTER_DAYS = 30;

// Outcome codes only, never the data and never the prompt, per the quick
// entry precedent.
function logOutcome(outcome: string, extra?: Record<string, number | string>) {
  console.log("insights:", JSON.stringify({ outcome, ...extra }));
}

export async function suggestInsights(): Promise<InsightsResult> {
  const supabase = await createClient();
  const user = await getVerifiedUser();
  if (!user) {
    logOutcome("no-session");
    return { ok: false, error: "Not signed in." };
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("ai_insights, approved")
    .eq("user_id", user.id)
    .maybeSingle();
  // Rides along in the select the consent check already performs, so approval
  // costs no round trip. It is checked BEFORE consent, because "waiting to be
  // approved" is the more useful thing to tell someone who has both problems.
  if (!canUseAi(settings)) {
    logOutcome("not-approved");
    return { ok: false, error: NOT_APPROVED };
  }
  if (!settings?.ai_insights) {
    logOutcome("gated");
    return { ok: false, error: "Turn on weekly insights in Settings first." };
  }

  const allowed = await checkRateLimit("insights", user.id);
  if (!allowed) {
    logOutcome("rate-limited");
    return { ok: false, error: limitMessage("insights") };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logOutcome("no-key");
    return { ok: false, error: UNAVAILABLE };
  }

  // The action takes no arguments, so there is no input to validate:
  // everything the model sees is derived here, behind auth and consent, and
  // the client cannot steer any of it. Stronger than plateau's proxy
  // property, which at least receives an exercise id.
  const data = await getInsightsData();

  // One derived list feeds the grouping, the detectors, and the message, so
  // they can never disagree. Sorted here rather than trusting the query: if
  // the read ever stopped returning oldest first, the slope would silently
  // flip sign and a declining lift would read as improving. A session with
  // no sets is dropped so the grouping below never has to consider one; the
  // detector would otherwise see Math.max over an empty array.
  const sessions = data.sessions
    .filter((s) => s.sets.length > 0)
    .slice()
    .sort((a, b) => (a.completedAt < b.completedAt ? -1 : 1));

  // One clock for the whole action, so the staleness cut, the detector's
  // recency window and the rendered "days ago" can never disagree by a tick.
  const now = new Date();
  const today = now.getTime();

  // Checked before the grouping and before the dashboard read, so a dormant
  // tap costs the one query it has already made and nothing more.
  const newest = sessions[sessions.length - 1];
  if (
    newest &&
    today - new Date(newest.completedAt).getTime() >
      STALE_AFTER_DAYS * 86_400_000
  ) {
    logOutcome("stale");
    return { ok: false, error: STALE };
  }

  const perLift = new Map<
    string,
    { completedAt: string; sets: InsightsSet[] }[]
  >();
  for (const session of sessions) {
    const byExercise = new Map<string, InsightsSet[]>();
    for (const set of session.sets) {
      const group = byExercise.get(set.exerciseId) ?? [];
      group.push(set);
      byExercise.set(set.exerciseId, group);
    }
    for (const [exerciseId, sets] of byExercise) {
      const list = perLift.get(exerciseId) ?? [];
      list.push({ completedAt: session.completedAt, sets });
      perLift.set(exerciseId, list);
    }
  }

  // Most recently trained first, capped. Each lift's session list is oldest
  // first because the outer walk was, so its last entry is its latest.
  const ranked = [...perLift.entries()]
    .map(([exerciseId, liftSessions]) => ({ exerciseId, liftSessions }))
    .sort((a, b) => {
      const aLast = a.liftSessions[a.liftSessions.length - 1].completedAt;
      const bLast = b.liftSessions[b.liftSessions.length - 1].completedAt;
      if (aLast !== bLast) return aLast < bLast ? 1 : -1;
      // A tie here is the COMMON case, since one workout trains several
      // lifts, so the cap needs a rule rather than whatever order the
      // grouping walk happened to insert. More history first: a lift at the
      // full window gives the model a real trend, while one with a single
      // session can only ever render "Not enough sessions yet".
      if (a.liftSessions.length !== b.liftSessions.length) {
        return b.liftSessions.length - a.liftSessions.length;
      }
      // Ids are unique, so this is what makes the order TOTAL rather than
      // merely more specified. Without it the comparator never returns 0 and
      // which five survive the cap is left to the sort implementation.
      if (a.exerciseId === b.exerciseId) return 0;
      return a.exerciseId < b.exerciseId ? -1 : 1;
    })
    .slice(0, MAX_LIFTS);

  if (ranked.length === 0) {
    logOutcome("no-data");
    return { ok: false, error: NO_DATA };
  }

  let anyStalled = false;
  const lifts: InsightLift[] = ranked.map(({ exerciseId, liftSessions }) => {
    const recent = liftSessions.slice(-WINDOW);
    const points = recent.map((s) => ({
      date: s.completedAt,
      value: Math.round(
        Math.max(...s.sets.map((x) => estimatedOneRepMax(x.weight, x.reps))),
      ),
    }));
    // The verdicts the prompt carries come from the shipped rules, imported
    // and never copied. The trend is reported by estimated one rep max
    // because the Progress screen's own trend indicator follows whichever
    // metric the lifter has selected there, so naming the measure here is
    // what keeps the two readings from contradicting each other.
    const status = plateauStatus(points, now);
    if (status === "stalled" || status === "declining") anyStalled = true;
    const info = data.exercises.get(exerciseId);
    // Below WINDOW points, fitSlope has no degrees of freedom left and hands
    // back a point interval, so a bare slope would read as a confident
    // direction. Refuse to claim one at all, the same way plateauStatus
    // already fails safe to "insufficient" below the window.
    const trendWord =
      points.length < WINDOW
        ? "Not enough sessions yet"
        : trendLabel(trendDirection(points.map((p) => p.value)));
    return {
      name: info?.name ?? "Unnamed exercise",
      muscleGroup: info?.muscleGroup ?? null,
      trendWord,
      stallCheck: status,
      sessions: recent.map((s) => ({
        daysAgo: Math.max(
          0,
          Math.floor((today - new Date(s.completedAt).getTime()) / 86_400_000),
        ),
        sets: s.sets.slice(0, MAX_SETS_PER_SESSION).map((x) => ({
          reps: x.reps,
          weight: x.weight,
          rirLow: x.rir_low,
          rirHigh: x.rir_high,
        })),
      })),
    };
  });

  // The same read that feeds the stat chips, so the card can never disagree
  // with the numbers rendered directly above it.
  const dashboard = await getDashboardData(now);
  const message = buildInsightsMessage({
    lifts,
    weeklyWorkouts: dashboard.weekly.workouts,
    weeklySets: dashboard.weekly.sets,
    streakWeeks: dashboard.streakWeeks,
  });

  // Annotated because an unannotated let would be implicit any here, the
  // same reason the plateau action annotates its suggestion.
  let result: Awaited<ReturnType<typeof insightsWithModel>>;
  try {
    // Constructed per request so an unconfigured build never throws at
    // import time. Same client settings as quick entry and plateau: 15
    // seconds bounds the wait, one retry covers a transient 529.
    result = await insightsWithModel(
      new Anthropic({ apiKey, timeout: 15_000, maxRetries: 1 }),
      message,
    );
  } catch (error) {
    // The MESSAGE only: API error messages carry status, not the request body.
    const cause = error instanceof Error ? error.message : "unknown";
    logOutcome("model-error", { cause });
    return { ok: false, error: UNAVAILABLE };
  }

  if (!result) {
    logOutcome("invalid-output");
    return { ok: false, error: NO_INSIGHTS };
  }

  logOutcome("ok", { count: result.insights.length });
  return { ok: true, insights: result.insights, anyStalled };
}

// Annotated rather than inferred, per the 2026-08-09 union widening bug.
export async function setAiInsights(
  enabled: boolean,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

  // Only enabling is gated. Turning a feature off must stay available to an
  // account whose approval was revoked while the feature was on, or the app
  // would hold a consent flag its owner cannot withdraw.
  if (enabled) {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("approved")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!canUseAi(settings)) return { error: NOT_APPROVED };
  }

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, ai_insights: enabled }, { onConflict: "user_id" });
  if (error) return { error: error.message };
  // Settings renders the switch; the dashboard passes the flag to the card.
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}
