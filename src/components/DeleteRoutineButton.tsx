"use client";

import { deleteRoutine } from "@/lib/data/actions";
import { Trash2 } from "lucide-react";

export function DeleteRoutineButton({ id }: { id: string }) {
  return (
    <form
      action={async () => {
        if (confirm("Delete this routine?")) {
          await deleteRoutine(id);
        }
      }}
    >
      <button
        type="submit"
        aria-label="Delete routine"
        className="flex items-center justify-center rounded-lg"
        style={{ color: "var(--text-dim)", minWidth: 44, minHeight: 44 }}
      >
        <Trash2 size={18} aria-hidden />
      </button>
    </form>
  );
}
