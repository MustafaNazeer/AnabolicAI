"use client";

import { useState } from "react";
import { setAiPlateau, suggestForPlateau } from "@/lib/ai/plateau/actions";
import type { PlateauStatus } from "@/lib/progress/plateau";
import { Skeleton } from "@/components/ui/Skeleton";

const fieldStyle = {
  background: "var(--surface-sunken)",
  border: "1px solid var(--surface-border)",
  borderRadius: "var(--radius-square)",
  color: "var(--text)",
  minHeight: 44,
} as const;

export function PlateauCard({
  exerciseId,
  exerciseName,
  status,
  aiEnabled,
  onAiEnabled,
}: {
  exerciseId: string;
  exerciseName: string;
  status: PlateauStatus;
  aiEnabled: boolean;
  onAiEnabled: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  // Only a confident claim earns the card. "uncertain" stays silent because a
  // stall banner over scattered sessions is exactly the overstatement the
  // trend confidence work exists to prevent.
  if (status !== "stalled" && status !== "declining") return null;

  async function fetchSuggestion() {
    setBusy(true);
    setError(null);
    const result = await suggestForPlateau(exerciseId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuggestion(result.suggestion.text);
  }

  async function ask() {
    // The notice always comes first while consent is off, so nothing is sent
    // before the user has seen what leaves the device.
    if (!aiEnabled) {
      setNotice(true);
      return;
    }
    await fetchSuggestion();
  }

  async function enable() {
    const result = await setAiPlateau(true);
    if ("error" in result) {
      setError(result.error);
      setNotice(false);
      return;
    }
    onAiEnabled();
    setNotice(false);
    await fetchSuggestion();
  }

  const copy =
    status === "declining"
      ? `Your estimated max on ${exerciseName} has been slipping across your last four sessions.`
      : `Your estimated max on ${exerciseName} has not moved across your last four sessions.`;

  return (
    <section
      className="p-4"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--surface-border)",
        borderRadius: "var(--radius-tile)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <p style={{ color: "var(--text)" }}>{copy}</p>

      {suggestion === null ? (
        <button
          type="button"
          onClick={() => void ask()}
          disabled={busy}
          className="mt-3 px-3 py-2 text-sm font-medium disabled:opacity-60"
          style={fieldStyle}
        >
          What should I try?
        </button>
      ) : null}

      {busy ? <Skeleton className="w-full mt-3" style={{ height: 20 }} /> : null}

      {error ? (
        <p
          className="text-xs mt-2"
          role="alert"
          style={{ color: "var(--danger, #b91c1c)" }}
        >
          {error}
        </p>
      ) : null}

      {notice ? (
        <div
          className="mt-3 p-3 text-sm"
          style={{
            background: "var(--surface-sunken)",
            border: "1px solid var(--surface-border)",
            borderRadius: "var(--radius-square)",
          }}
        >
          <p style={{ color: "var(--text)" }}>
            This sends this lift&apos;s last few sessions (days ago, sets, reps,
            weight, RIR) and your default rest time to Anthropic&apos;s API to
            suggest a next step, only when you ask. No account details leave
            the app. Turn it off any time in Settings.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => void enable()}
              className="px-3 py-2 text-sm font-medium"
              style={fieldStyle}
            >
              Enable
            </button>
            <button
              type="button"
              onClick={() => setNotice(false)}
              className="px-3 py-2 text-sm"
              style={{ ...fieldStyle, color: "var(--text-dim)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {suggestion !== null ? (
        <div role="status" className="mt-3">
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            AI suggestion
          </p>
          <p style={{ color: "var(--text)" }}>{suggestion}</p>
        </div>
      ) : null}
    </section>
  );
}
