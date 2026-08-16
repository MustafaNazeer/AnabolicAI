"use client";

import { useId, useState } from "react";
import { addPlannerCategory } from "@/lib/planner/categoryActions";

// Adds one of her own categories, from inside the day sheet, because the moment
// she wants a label that does not exist is the moment she is looking for it.
//
// A form rather than a bare button, so the iPhone keyboard offers Go and the
// name can be added without reaching for a second control.
export function PlannerCategoryAdd() {
  const fieldId = useId();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const result = await addPlannerCategory(name);
    setBusy(false);
    // The field keeps its text on a failure. Clearing it would lose the name to
    // a network blip and make her type it again.
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setName("");
  }

  return (
    <div className="mt-3.5">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label htmlFor={fieldId} className="sr-only">
          New category
        </label>
        <input
          id={fieldId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category"
          className="flex-1 px-3 border text-[13px]"
          style={{
            minHeight: 44,
            borderRadius: "var(--radius-square)",
            background: "var(--surface)",
            borderColor: "var(--surface-border)",
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
          Add
        </button>
      </form>

      {error ? (
        <p role="alert" className="text-xs mt-2" style={{ color: "var(--trend-down)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
