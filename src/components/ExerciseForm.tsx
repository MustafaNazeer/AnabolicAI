"use client";

import { useState } from "react";
import { ChoiceChip } from "@/components/ui/Chip";
import { GROUPS, EQUIPMENT } from "@/lib/data/vocabulary";

const fieldStyle = {
  background: "var(--surface-sunken)",
  border: "1px solid var(--surface-border)",
  borderRadius: "var(--radius-square)",
  color: "var(--text)",
  minHeight: 44,
} as const;

// One form, three callers: create from the picker, edit from the picker, and
// the Settings sweep. Keeping it in one place is what stops the three
// drifting, which matters because two of them write the same columns.
export function ExerciseForm({
  initialName,
  initialGroup,
  initialEquipment,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initialName: string;
  initialGroup: string | null;
  initialEquipment: string | null;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onSubmit: (name: string, group: string, equipment: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [group, setGroup] = useState<string | null>(initialGroup);
  const [equipment, setEquipment] = useState<string | null>(initialEquipment);

  const ready =
    name.trim().length > 0 && group !== null && equipment !== null && !pending;

  return (
    <div className="flex flex-col gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Exercise name"
        placeholder="Exercise name"
        className="w-full px-3 py-2"
        style={fieldStyle}
      />

      <div
        role="radiogroup"
        aria-label="Muscle group"
        className="flex gap-1.5 overflow-x-auto py-1"
      >
        {GROUPS.map((g) => (
          <ChoiceChip
            key={g}
            label={g}
            selected={group === g}
            // Selecting only, never clearing. The field is required, so a
            // second tap that cleared it would disable submit with nothing on
            // screen saying why. This is the deliberate divergence from the
            // filter chips, where clearing is exactly what you want.
            onSelect={() => setGroup(g)}
          />
        ))}
      </div>

      <div
        role="radiogroup"
        aria-label="Equipment"
        className="flex gap-1.5 overflow-x-auto py-1"
      >
        {EQUIPMENT.map((eq) => (
          <ChoiceChip
            key={eq}
            label={eq}
            selected={equipment === eq}
            onSelect={() => setEquipment(eq)}
          />
        ))}
      </div>

      <div role="alert">
        {error ? (
          <p className="text-xs" style={{ color: "var(--danger, #b91c1c)" }}>
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            if (group === null || equipment === null) return;
            onSubmit(name.trim(), group, equipment);
          }}
          className="px-3 py-2 text-sm font-medium disabled:opacity-60"
          style={fieldStyle}
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-sm"
          style={{ ...fieldStyle, color: "var(--text-dim)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
