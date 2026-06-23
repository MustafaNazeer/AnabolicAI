import { createRoutine } from "@/lib/data/actions";
import { Plus } from "lucide-react";

export function NewRoutineButton() {
  return (
    <form action={createRoutine}>
      <button
        type="submit"
        className="flex items-center justify-center gap-2 px-4 py-3 font-semibold w-full"
        style={{
          background: "var(--accent)",
          color: "var(--on-accent)",
          borderRadius: "var(--radius-tile)",
          minHeight: 48,
        }}
      >
        <Plus size={18} aria-hidden />
        New routine
      </button>
    </form>
  );
}
