import { Skeleton } from "@/components/ui/Skeleton";

export default function LogLoading() {
  return (
    <main className="px-5 pt-12 pb-24">
      <Skeleton style={{ height: 28, width: 200, borderRadius: 8 }} />
      <div className="flex flex-col gap-3 mt-6">
        <Skeleton style={{ height: 56 }} />
        <Skeleton style={{ height: 56 }} />
      </div>
    </main>
  );
}
