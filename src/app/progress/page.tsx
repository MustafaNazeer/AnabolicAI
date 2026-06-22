import { getProgressData } from "@/lib/progress/queries";
import { ProgressView } from "@/components/ProgressView";

export default async function ProgressPage() {
  const data = await getProgressData();
  return (
    <main className="px-5 pt-12 pb-24">
      <h1 className="text-2xl font-bold mb-6">Progress</h1>
      <ProgressView data={data} />
    </main>
  );
}
