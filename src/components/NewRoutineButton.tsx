import { createRoutine } from "@/lib/data/actions";
import { Plus } from "lucide-react";

export function NewRoutineButton() {
  return (
    <form action={createRoutine}>
      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold w-full"
        style={{ background: "var(--accent)", color: "#08090b", minHeight: 48 }}
      >
        <Plus size={18} aria-hidden />
        New routine
      </button>
    </form>
  );
}
