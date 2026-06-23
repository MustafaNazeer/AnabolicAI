"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, X, Minus, Plus } from "lucide-react";
import { moveItem } from "@/lib/routines/edit";
import { runViewTransition } from "@/lib/motion/viewTransition";
import { saveRoutine } from "@/lib/data/actions";
import { ExercisePicker } from "@/components/ExercisePicker";
import type { Exercise, RoutineDetail } from "@/lib/data/types";
import { ErrorRetry } from "@/components/ui/ErrorRetry";

type DraftItem = { exercise: Exercise; defaultSets: number };

const stepperStyle = {
  background: "var(--surface-sunken)",
  border: "1px solid var(--surface-border)",
  borderRadius: "var(--radius-square)",
  minWidth: 44,
  minHeight: 44,
} as const;

export function RoutineEditor({
  routine,
  library,
}: {
  routine: RoutineDetail;
  library: Exercise[];
}) {
  const router = useRouter();
  const [name, setName] = useState(routine.name);
  const [items, setItems] = useState<DraftItem[]>(
    routine.items.map((it) => ({
      exercise: it.exercise,
      defaultSets: it.default_sets,
    })),
  );
  const [extra, setExtra] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const takenIds = new Set(items.map((i) => i.exercise.id));
  const fullLibrary = [...library, ...extra];

  function add(exercise: Exercise) {
    setSaved(false);
    runViewTransition(() => {
      setItems((cur) => [...cur, { exercise, defaultSets: 3 }]);
    });
  }
  function remove(index: number) {
    setSaved(false);
    runViewTransition(() => {
      setItems((cur) => cur.filter((_, i) => i !== index));
    });
  }
  function move(index: number, dir: "up" | "down") {
    setSaved(false);
    runViewTransition(() => {
      setItems((cur) => moveItem(cur, index, dir));
    });
  }
  function setSets(index: number, sets: number) {
    setSaved(false);
    setItems((cur) =>
      cur.map((it, i) =>
        i === index ? { ...it, defaultSets: Math.max(1, sets) } : it,
      ),
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveRoutine(
        routine.id,
        name,
        items.map((it) => ({
          exerciseId: it.exercise.id,
          defaultSets: it.defaultSets,
        })),
      );
      if (result?.error) {
        setError(result.error);
      } else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <main className="px-5 pt-12 pb-28">
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setSaved(false);
        }}
        aria-label="Routine name"
        className="w-full text-[26px] font-semibold bg-transparent mb-6"
        style={{ fontFamily: "var(--font-spectral)", color: "var(--text)" }}
      />

      <ul className="flex flex-col gap-2 mb-6">
        {items.map((it, i) => (
          <li
            key={it.exercise.id}
            className="px-3 py-3"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--surface-border)",
              borderRadius: "var(--radius-tile)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              viewTransitionName: `routine-item-${it.exercise.id.replace(/[^a-zA-Z0-9_-]/g, "")}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium" style={{ color: "var(--text)" }}>
                {it.exercise.name}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${it.exercise.name}`}
                style={{ color: "var(--text-dim)", minWidth: 44, minHeight: 44 }}
                className="flex items-center justify-center"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSets(i, it.defaultSets - 1)}
                  aria-label="Fewer sets"
                  style={stepperStyle}
                  className="flex items-center justify-center"
                >
                  <Minus size={16} aria-hidden />
                </button>
                <span
                  className="w-16 text-center text-sm"
                  style={{ color: "var(--text-dim)" }}
                >
                  {it.defaultSets} sets
                </span>
                <button
                  type="button"
                  onClick={() => setSets(i, it.defaultSets + 1)}
                  aria-label="More sets"
                  style={stepperStyle}
                  className="flex items-center justify-center"
                >
                  <Plus size={16} aria-hidden />
                </button>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, "up")}
                  aria-label="Move up"
                  style={{ color: "var(--text-dim)", minWidth: 44, minHeight: 44 }}
                  className="flex items-center justify-center"
                >
                  <ArrowUp size={18} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, "down")}
                  aria-label="Move down"
                  style={{ color: "var(--text-dim)", minWidth: 44, minHeight: 44 }}
                  className="flex items-center justify-center"
                >
                  <ArrowDown size={18} aria-hidden />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mb-6">
        <ExercisePicker
          library={fullLibrary}
          takenIds={takenIds}
          onAdd={add}
          onCreated={(e) => {
            setExtra((cur) => [...cur, e]);
            add(e);
          }}
        />
      </div>

      {error ? (
        <div className="mb-3">
          <ErrorRetry message={error} onRetry={save} pending={pending} />
        </div>
      ) : null}

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="font-semibold py-3 w-full disabled:opacity-60"
        style={{
          background: "var(--accent)",
          color: "var(--on-accent)",
          borderRadius: "var(--radius-tile)",
          minHeight: 48,
        }}
      >
        {pending ? "Saving" : saved ? "Saved" : "Save"}
      </button>
    </main>
  );
}
