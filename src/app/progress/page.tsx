import { getProgressData, getRoutineVolumeData } from "@/lib/progress/queries";
import { getGoalsByExercise } from "@/lib/goals/queries";
import { ProgressView } from "@/components/ProgressView";

export default async function ProgressPage() {
  const [data, routineVolume, goals] = await Promise.all([
    getProgressData(),
    getRoutineVolumeData(),
    getGoalsByExercise(),
  ]);
  return (
    <main className="px-5 pt-12 pb-24">
      <h1
        className="text-[26px] font-semibold mb-6"
        style={{ fontFamily: "var(--font-spectral)", color: "var(--text)" }}
      >
        Progress
      </h1>
      <ProgressView data={data} routineVolume={routineVolume} goals={goals} />
    </main>
  );
}
