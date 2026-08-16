"use client";

import { useId, useState } from "react";
import { Card } from "@/components/ui/Card";
import { setDisplayName } from "@/lib/profile/actions";
import { parseDisplayName } from "@/lib/profile/name";

// Asked once, on the dashboard, when display_name has never been written.
//
// IT IS DISMISSIBLE AND THAT IS WHAT MAKES IT A ONE TIME QUESTION. "Not now"
// writes an empty string, which is how the column records "asked and declined";
// null is reserved for never asked. Without that, dismissing would only hide
// the card until the next load and the app would nag forever.
//
// It hides itself on success rather than waiting for the server render, so the
// answer feels immediate; the revalidate behind the action is what makes the
// greeting itself change.
export function NamePrompt() {
  const fieldId = useId();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function save(value: string) {
    setBusy(true);
    setError(null);
    const result = await setDisplayName(value);
    setBusy(false);
    // Stays put on a failure, holding what was typed, so a retry is one tap.
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  function submit() {
    const parsed = parseDisplayName(name);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    void save(parsed.name);
  }

  if (done) return null;

  return (
    <Card className="px-4 py-4 mt-4" style={{ borderRadius: "var(--radius-tile)" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label
          htmlFor={fieldId}
          className="block text-[13px] mb-2"
          style={{ color: "var(--text)" }}
        >
          What should I call you?
        </label>
        <input
          id={fieldId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="given-name"
          className="w-full px-3 text-[15px]"
          style={{
            minHeight: 44,
            borderRadius: "var(--radius-square)",
            background: "var(--surface-sunken)",
            border: "1px solid var(--surface-border)",
            color: "var(--text)",
          }}
        />
        <div className="flex gap-2 mt-3">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 font-medium"
            style={{
              minHeight: 44,
              borderRadius: "var(--radius-square)",
              background: "var(--accent)",
              color: "var(--on-accent)",
              opacity: busy ? 0.6 : 1,
            }}
          >
            Save
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save("")}
            className="flex-1 border font-medium"
            style={{
              minHeight: 44,
              borderRadius: "var(--radius-square)",
              background: "var(--surface)",
              borderColor: "var(--surface-border)",
              color: "var(--text)",
              opacity: busy ? 0.6 : 1,
            }}
          >
            Not now
          </button>
        </div>
      </form>

      {error ? (
        <p role="alert" className="text-xs mt-2" style={{ color: "var(--trend-down)" }}>
          {error}
        </p>
      ) : null}
    </Card>
  );
}
