"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";
import { colorForIndex } from "@/lib/progress/palette";
import type { RoutineVolumePoint } from "@/lib/progress/types";

// Only the drawing is deferred. The legend below stays here so it renders
// immediately: it names the exercises for a screen reader, and it is real
// content rather than decoration.
const RoutineVolumeCanvas = dynamic(
  () => import("@/components/RoutineVolumeCanvas"),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full" style={{ height: 200 }} />,
  },
);

export function RoutineVolumeChart({
  exercises,
  points,
}: {
  exercises: { id: string; name: string }[];
  points: RoutineVolumePoint[];
}) {
  return (
    <div>
      <RoutineVolumeCanvas exercises={exercises} points={points} />
      <ul
        aria-label="Exercises"
        className="flex flex-wrap gap-x-4 gap-y-1 mt-3"
      >
        {exercises.map((ex, i) => (
          <li
            key={ex.id}
            className="inline-flex items-center gap-2 text-xs"
            style={{ color: "var(--text-dim)" }}
          >
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: colorForIndex(i),
              }}
            />
            {ex.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
