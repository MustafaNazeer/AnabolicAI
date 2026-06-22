import { notFound } from "next/navigation";
import { getRoutine, getExercises } from "@/lib/data/queries";
import { RoutineEditor } from "@/components/RoutineEditor";

export default async function RoutineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [routine, library] = await Promise.all([getRoutine(id), getExercises()]);
  if (!routine) notFound();

  return <RoutineEditor routine={routine} library={library} />;
}
