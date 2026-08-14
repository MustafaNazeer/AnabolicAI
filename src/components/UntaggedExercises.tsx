"use client";

import { useState, useTransition } from "react";
import { updateExercise } from "@/lib/data/actions";
import { ExerciseForm } from "@/components/ExerciseForm";
import type { Exercise } from "@/lib/data/types";

// The picker fixes what you happen to notice. This answers "how many are
// left", which the picker cannot, and it is where the backlog gets cleared
// deliberately rather than by chance.
export function UntaggedExercises({ initial }: { initial: Exercise[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(name: string, group: string, equipment: string) {
    const target = editing;
    if (!target) return;
    setError(null);
    startTransition(async () => {
      const result = await updateExercise(target.id, name, group, equipment);
      if (result.exercise) {
        // Fully tagged now, so it leaves the list. Filtered by id rather than
        // by re-reading, so the row disappears with no round trip.
        setItems((current) => current.filter((e) => e.id !== target.id));
        setEditing(null);
        return;
      }
      setError(result.error ?? "Could not save the exercise.");
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-dim)" }}>
        Every exercise you have added is tagged.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm" style={{ color: "var(--text-dim)" }}>
        These are missing a muscle group or an equipment type, so the filters
        on the exercise picker cannot find them.
      </p>
      <ul className="flex flex-col gap-1">
        {items.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              aria-label={`Tag ${e.name}`}
              onClick={() => {
                setError(null);
                setEditing(e);
              }}
              className="w-full rounded-lg px-3 py-2 text-left"
              style={{ color: "var(--text)", minHeight: 44 }}
            >
              {e.name}
            </button>
          </li>
        ))}
      </ul>
      {editing ? (
        <ExerciseForm
          key={editing.id}
          initialName={editing.name}
          initialGroup={editing.muscle_group}
          initialEquipment={editing.equipment}
          submitLabel="Save"
          pending={pending}
          error={error}
          onSubmit={save}
          onCancel={() => {
            setEditing(null);
            setError(null);
          }}
        />
      ) : null}
    </div>
  );
}
