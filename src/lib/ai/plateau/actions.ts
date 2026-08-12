"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, limitMessage } from "@/lib/security/rateLimit";
import { estimatedOneRepMax } from "@/lib/progress/strength";
import { plateauStatus } from "@/lib/progress/plateau";
import { getPlateauData } from "@/lib/ai/plateau/queries";
import { buildPlateauMessage } from "@/lib/ai/plateau/prompt";
import { suggestWithModel } from "@/lib/ai/plateau/suggest";
import type { PlateauSuggestion } from "@/lib/ai/plateau/schema";

export type SuggestResult =
  | { ok: true; suggestion: PlateauSuggestion }
  | { ok: false; error: string };

const UNAVAILABLE = "Suggestions are unavailable right now.";
const NOT_STALLED = "This lift does not look stalled right now.";
const NO_SUGGESTION = "Could not come up with a suggestion. Try again in a moment.";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The message is the billed side of this call and a session can hold an
// unbounded number of sets, so the rendering is capped. The detector still
// sees every set, because it takes a maximum and dropping one could change
// the verdict.
const MAX_SETS_PER_SESSION = 12;

// Outcome codes only, never the data and never the prompt, per the quick
// entry precedent.
function logOutcome(outcome: string, extra?: Record<string, number | string>) {
  console.log("plateau-suggest:", JSON.stringify({ outcome, ...extra }));
}

export async function suggestForPlateau(
  exerciseId: string,
): Promise<SuggestResult> {
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
    .select("ai_plateau")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!settings?.ai_plateau) {
    logOutcome("gated");
    return { ok: false, error: "Turn on plateau suggestions in Settings first." };
  }

  if (!UUID.test(exerciseId)) {
    logOutcome("invalid-input");
    return { ok: false, error: NOT_STALLED };
  }

  const allowed = await checkRateLimit("plateau", user.id);
  if (!allowed) {
    logOutcome("rate-limited");
    return { ok: false, error: limitMessage("plateau") };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logOutcome("no-key");
    return { ok: false, error: UNAVAILABLE };
  }

  // The client sends only the id. Everything the model sees is re-derived
  // here, and the stall is re-checked, so this action can never be used as a
  // proxy for arbitrary content and never speaks about a lift that is not
  // actually stalled. Required, not defensive, per the quick entry catalogue
  // validation reasoning.
  const data = await getPlateauData(exerciseId);
  if (!data) {
    logOutcome("not-stalled", { reason: "no-data" });
    return { ok: false, error: NOT_STALLED };
  }
  // One derived list feeds both the detector and the message, so they can
  // never disagree about which sessions exist or what order they are in.
  // Sorted here rather than trusting the query: if the read ever stopped
  // returning oldest first, the slope would silently flip sign and a
  // declining lift would read as improving.
  //
  // Math.max over an empty array is negative infinity, which would flow into
  // the detector as a real number and produce a nonsense verdict instead of
  // an error, so a session with no sets is dropped before that reduction.
  const sessions = data.sessions
    .filter((s) => s.sets.length > 0)
    .slice()
    .sort((a, b) => (a.completedAt < b.completedAt ? -1 : 1));

  const points = sessions.map((s) => ({
    date: s.completedAt,
    value: Math.round(
      Math.max(...s.sets.map((x) => estimatedOneRepMax(x.weight, x.reps))),
    ),
  }));
  const status = plateauStatus(points, new Date());
  if (status !== "stalled" && status !== "declining") {
    logOutcome("not-stalled", { status });
    return { ok: false, error: NOT_STALLED };
  }

  const today = Date.now();
  const message = buildPlateauMessage({
    exerciseName: data.exerciseName,
    muscleGroup: data.muscleGroup,
    restSeconds: data.restSeconds,
    sessions: sessions.map((s) => ({
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
  });

  let suggestion: PlateauSuggestion | null;
  try {
    // Constructed per request so an unconfigured build never throws at import
    // time. Same client settings as quick entry: 15 seconds bounds the wait,
    // one retry covers a transient 529.
    suggestion = await suggestWithModel(
      new Anthropic({ apiKey, timeout: 15_000, maxRetries: 1 }),
      message,
    );
  } catch (error) {
    // The MESSAGE only: API error messages carry status, not the request body.
    const cause = error instanceof Error ? error.message : "unknown";
    logOutcome("model-error", { cause });
    return { ok: false, error: UNAVAILABLE };
  }

  if (!suggestion) {
    logOutcome("invalid-output");
    return { ok: false, error: NO_SUGGESTION };
  }

  logOutcome("ok", { kind: suggestion.kind });
  return { ok: true, suggestion };
}

// Annotated rather than inferred, per the 2026-08-09 union widening bug.
export async function setAiPlateau(
  enabled: boolean,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, ai_plateau: enabled }, { onConflict: "user_id" });
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}
