import { Skeleton } from "@/components/ui/Skeleton";

export default function ProgressLoading() {
  return (
    <main className="px-5 pt-12 pb-24">
      <Skeleton style={{ height: 28, width: 160, borderRadius: 8 }} />
      <Skeleton style={{ height: 44, marginTop: 24 }} />
      <Skeleton style={{ height: 200, marginTop: 32 }} />
      <Skeleton style={{ height: 200, marginTop: 32 }} />
    </main>
  );
}
