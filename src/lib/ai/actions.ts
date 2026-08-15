"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, limitMessage } from "@/lib/security/rateLimit";
import { parseWithModel } from "@/lib/ai/parse";
import { validateQuickEntryText } from "@/lib/ai/validate";
import type { ParsedSet } from "@/lib/ai/schema";
import { getVerifiedUser } from "@/lib/auth/user";
import { canUseAi } from "@/lib/accounts/approval";

export type QuickEntryResult =
  | { ok: true; sets: ParsedSet[] }
  | { ok: false; error: string };

const CANNOT_READ = 'Could not read any sets in that. Try "185 for 5, then 5".';
const UNAVAILABLE = "Quick entry is unavailable right now. Log sets manually.";
const NOT_APPROVED = "This account is waiting to be approved.";

// Outcome codes only, never the typed text. An action that answers the same
// shape on every failure is undebuggable without this, per the rest push
// lesson of 2026-08-04.
function logOutcome(outcome: string, extra?: Record<string, number | string>) {
  console.log("quick-entry:", JSON.stringify({ outcome, ...extra }));
}

export async function parseQuickEntry(raw: string): Promise<QuickEntryResult> {
  const supabase = await createClient();
  const user = await getVerifiedUser();
  if (!user) {
    logOutcome("no-session");
    return { ok: false, error: "Not signed in." };
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("ai_quick_entry, approved")
    .eq("user_id", user.id)
    .maybeSingle();
  // Rides along in the select the consent check already performs, so approval
  // costs no round trip. It is checked BEFORE consent, because "waiting to be
  // approved" is the more useful thing to tell someone who has both problems.
  if (!canUseAi(settings)) {
    logOutcome("not-approved");
    return { ok: false, error: NOT_APPROVED };
  }
  if (!settings?.ai_quick_entry) {
    logOutcome("gated");
    return { ok: false, error: "Turn on AI quick entry in Settings first." };
  }

  const input = validateQuickEntryText(raw);
  if (!input.ok) {
    logOutcome("invalid-input");
    return { ok: false, error: CANNOT_READ };
  }

  const allowed = await checkRateLimit("quickEntry", user.id);
  if (!allowed) {
    logOutcome("rate-limited");
    return { ok: false, error: limitMessage("quickEntry") };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logOutcome("no-key");
    return { ok: false, error: UNAVAILABLE };
  }

  let sets: ParsedSet[] | null;
  try {
    // Constructed per request so an unconfigured build never throws at import
    // time, the same shape as the QStash verifier. The timeout is milliseconds
    // in the TypeScript SDK; 15 seconds bounds a mid workout wait, and one
    // retry covers a transient 529 without doubling the worst case much.
    sets = await parseWithModel(
      new Anthropic({ apiKey, timeout: 15_000, maxRetries: 1 }),
      input.text,
    );
  } catch (error) {
    // The MESSAGE only, mirroring the rate limiter's logging rail. API error
    // messages carry status information, not the request body.
    const cause = error instanceof Error ? error.message : "unknown";
    logOutcome("model-error", { cause });
    return { ok: false, error: UNAVAILABLE };
  }

  if (!sets) {
    logOutcome("invalid-output");
    return { ok: false, error: CANNOT_READ };
  }

  logOutcome("ok", { sets: sets.length });
  return { ok: true, sets };
}

// The return type is annotated rather than inferred: without it the union
// widens to `{ error?: undefined }` on the success arm, and a caller narrowing
// with `"error" in result` gets `string | undefined` instead of `string`.
export async function setAiQuickEntry(
  enabled: boolean,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, ai_quick_entry: enabled },
      { onConflict: "user_id" },
    );
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}
