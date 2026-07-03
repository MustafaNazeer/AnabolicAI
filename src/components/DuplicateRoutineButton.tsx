import { duplicateRoutine } from "@/lib/data/actions";
import { Copy } from "lucide-react";

export function DuplicateRoutineButton({ id }: { id: string }) {
  return (
    <form action={duplicateRoutine.bind(null, id)}>
      <button
        type="submit"
        aria-label="Duplicate routine"
        className="flex items-center justify-center rounded-lg"
        style={{ color: "var(--text-dim)", minWidth: 44, minHeight: 44 }}
      >
        <Copy size={18} aria-hidden />
      </button>
    </form>
  );
}
