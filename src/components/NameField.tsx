"use client";

import { useId, useState } from "react";
import { setDisplayName } from "@/lib/profile/actions";
import { parseDisplayName } from "@/lib/profile/name";

// Changing the name later, from Settings. The prompt on the dashboard asks
// once; this is the only way to change that answer afterwards, including for
// someone who dismissed the prompt and later wants a name after all.
//
// AN EMPTY FIELD IS REFUSED HERE, unlike "Not now" on the prompt. There an
// empty string means "asked and declined" and is worth storing; here it means
// the box was cleared, and storing it would silently drop the name they had.
export function NameField({ initial }: { initial: string }) {
  const fieldId = useId();
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit() {
    const parsed = parseDisplayName(name);
    if ("error" in parsed) {
      setError(parsed.error);
      setSaved(false);
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    const result = await setDisplayName(parsed.name);
    setBusy(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label htmlFor={fieldId} className="sr-only">
          Your name
        </label>
        <input
          id={fieldId}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          placeholder="Your name"
          autoComplete="given-name"
          className="flex-1 px-3 text-[15px]"
          style={{
            minHeight: 44,
            borderRadius: "var(--radius-square)",
            background: "var(--surface-sunken)",
            border: "1px solid var(--surface-border)",
            color: "var(--text)",
          }}
        />
        <button
          type="submit"
          disabled={busy}
          className="px-4 border font-medium text-[13px]"
          style={{
            minHeight: 44,
            borderRadius: "var(--radius-square)",
            background: "var(--surface)",
            borderColor: "var(--surface-border)",
            color: "var(--text)",
            opacity: busy ? 0.6 : 1,
          }}
        >
          Save
        </button>
      </form>

      {error ? (
        <p role="alert" className="text-xs mt-2" style={{ color: "var(--trend-down)" }}>
          {error}
        </p>
      ) : null}
      {saved && !error ? (
        <p role="status" className="text-xs mt-2" style={{ color: "var(--text-dim)" }}>
          Saved.
        </p>
      ) : null}
    </div>
  );
}
