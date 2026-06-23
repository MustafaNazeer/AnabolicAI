import Link from "next/link";
import { startSession } from "@/lib/workout/actions";
import type { Routine } from "@/lib/data/types";
import { Play } from "lucide-react";

export function StartWorkoutList({ routines }: { routines: Routine[] }) {
  if (routines.length === 0) {
    return (
      <p style={{ color: "var(--text-dim)" }}>
        Create a routine first on the{" "}
        <Link href="/routines" style={{ color: "var(--accent)" }}>
          Routines
        </Link>{" "}
        tab.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {routines.map((r) => (
        <li key={r.id}>
          <form action={startSession.bind(null, r.id)}>
            <button
              type="submit"
              className="flex w-full items-center justify-between px-4 py-4 font-medium"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--surface-border)",
                borderRadius: "var(--radius-tile)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                color: "var(--text)",
                minHeight: 56,
              }}
            >
              {r.name}
              <Play size={18} aria-hidden style={{ color: "var(--accent)" }} />
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
