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

export type InsightsResult =
  | { ok: true; insights: string[]; anyStalled: boolean }
  | { ok: false; error: string };

const UNAVAILABLE = "Insights are unavailable right now.";
const NO_DATA = "Log a few workouts first.";
const NO_INSIGHTS = "Could not come up with insights. Try again in a moment.";

// The message is the billed side of this call. Five lifts of four sessions
// bound its size; the per session set cap is the plateau one, because a
// session can hold an unbounded number of sets.
const MAX_LIFTS = 5;
const MAX_SETS_PER_SESSION = 12;

// Outcome codes only, never the data and never the prompt, per the quick
// entry precedent.
function logOutcome(outcome: string, extra?: Record<string, number | string>) {
  console.log("insights:", JSON.stringify({ outcome, ...extra }));
}

export async function suggestInsights(): Promise<InsightsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    logOutcome("no-session");
    return { ok: false, error: "Not signed in." };
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("ai_insights")
    .eq("user_id", user.id)
    .maybeSingle();
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
  // no sets would put Math.max over an empty array (negative infinity) into
  // the detector, so it is dropped first.
  const sessions = data.sessions
    .filter((s) => s.sets.length > 0)
    .slice()
    .sort((a, b) => (a.completedAt < b.completedAt ? -1 : 1));

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
    .sort((a, b) =>
      a.liftSessions[a.liftSessions.length - 1].completedAt <
      b.liftSessions[b.liftSessions.length - 1].completedAt
        ? 1
        : -1,
    )
    .slice(0, MAX_LIFTS);

  if (ranked.length === 0) {
    logOutcome("no-data");
    return { ok: false, error: NO_DATA };
  }

  const now = new Date();
  const today = now.getTime();
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, ai_insights: enabled }, { onConflict: "user_id" });
  if (error) return { error: error.message };
  // Settings renders the switch; the dashboard passes the flag to the card.
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}
