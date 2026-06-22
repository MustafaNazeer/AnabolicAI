import Link from "next/link";
import { getRoutines } from "@/lib/data/queries";
import { NewRoutineButton } from "@/components/NewRoutineButton";
import { DeleteRoutineButton } from "@/components/DeleteRoutineButton";

export default async function RoutinesPage() {
  const routines = await getRoutines();

  return (
    <main className="px-5 pt-12 pb-24">
      <h1 className="text-2xl font-bold mb-6">Routines</h1>

      {routines.length === 0 ? (
        <p style={{ color: "var(--text-dim)" }} className="mb-6">
          No routines yet. Create your first one.
        </p>
      ) : (
        <ul className="flex flex-col gap-3 mb-6">
          {routines.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: "var(--surface)" }}
            >
              <Link href={`/routines/${r.id}`} className="flex-1 font-medium py-2">
                {r.name}
              </Link>
              <DeleteRoutineButton id={r.id} />
            </li>
          ))}
        </ul>
      )}

      <NewRoutineButton />
    </main>
  );
}
