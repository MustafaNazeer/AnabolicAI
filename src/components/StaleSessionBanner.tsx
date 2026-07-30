"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { discardSession } from "@/lib/workout/actions";
import { shortDate } from "@/lib/progress/format";

const actionStyle = {
  borderRadius: "var(--radius-square)",
  border: "1px solid var(--surface-border)",
  color: "var(--text)",
  minHeight: 44,
  paddingInline: 12,
} as const;

// Shown when a workout has been left open. Discard exists so clearing a stale
// session does not record a phantom workout in the dashboard, the streak and
// the weekly recap, which is what finishing an empty session would do.
export function StaleSessionBanner({
  sessionId,
  startedAt,
  onFinish,
}: {
  sessionId: string;
  startedAt: string;
  onFinish: () => void;
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (dismissed) return null;

  function discard() {
    startTransition(async () => {
      await discardSession(sessionId);
      router.push("/log");
    });
  }

  return (
    <div
      role="status"
      className="text-sm px-4 py-3 mb-4"
      style={{
        background: "var(--surface-sunken)",
        border: "1px solid var(--surface-border)",
        borderRadius: "var(--radius-tile)",
        color: "var(--text-dim)",
      }}
    >
      <p>You left this workout open on {shortDate(startedAt)}.</p>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span>Delete it and its sets?</span>
          <button
            type="button"
            onClick={discard}
            disabled={pending}
            className="disabled:opacity-60"
            style={actionStyle}
          >
            Yes, discard
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            style={actionStyle}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button type="button" onClick={() => setDismissed(true)} style={actionStyle}>
            Resume
          </button>
          <button type="button" onClick={onFinish} style={actionStyle}>
            Finish
          </button>
          <button type="button" onClick={() => setConfirming(true)} style={actionStyle}>
            Discard
          </button>
        </div>
      )}
    </div>
  );
}
