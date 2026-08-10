"use client";

import { useState } from "react";
import { setAiQuickEntry } from "@/lib/ai/actions";

// Visually the same row as the notification settings rows, kept standalone so
// the AI section does not entangle NotificationSettings' save cycle.
export function AiQuickEntryToggle({ initial }: { initial: boolean }) {
  const [checked, setChecked] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function change(next: boolean) {
    setChecked(next);
    setBusy(true);
    const result = await setAiQuickEntry(next);
    setBusy(false);
    if ("error" in result) setChecked(!next);
  }

  return (
    <label
      className="flex items-center justify-between px-4 py-3"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--surface-border)",
        borderRadius: "var(--radius-tile)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        opacity: busy ? 0.5 : 1,
      }}
    >
      <span>
        <span className="font-medium" style={{ color: "var(--text)" }}>
          AI quick entry
        </span>
        <span className="block text-xs" style={{ color: "var(--text-dim)" }}>
          Turns typed set descriptions into sets. Sends only what you type.
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={busy}
        onChange={(e) => void change(e.target.checked)}
        aria-label="AI quick entry"
        className="h-6 w-6"
        style={{ accentColor: "var(--accent)" }}
      />
    </label>
  );
}
