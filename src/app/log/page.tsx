import { redirect } from "next/navigation";
import { getActiveSession } from "@/lib/workout/queries";
import { getRoutines } from "@/lib/data/queries";
import { StartWorkoutList } from "@/components/StartWorkoutList";

export default async function LogPage() {
  const active = await getActiveSession();
  if (active) redirect(`/log/${active.id}`);

  const routines = await getRoutines();
  return (
    <main className="px-5 pt-12 pb-24">
      <h1 className="text-2xl font-bold mb-6">Start a workout</h1>
      <StartWorkoutList routines={routines} />
    </main>
  );
}
