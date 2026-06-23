import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <main className="px-4 pt-12 pb-28">
      <Skeleton style={{ height: 14, width: 140, borderRadius: 6 }} />
      <Skeleton style={{ height: 28, width: 200, marginTop: 8, borderRadius: 8 }} />
      <Skeleton style={{ height: 44, marginTop: 16 }} />
      <Skeleton style={{ height: 230, marginTop: 16, borderRadius: "var(--radius-card)" }} />
      <div className="flex gap-2.5 mt-3.5">
        <Skeleton className="flex-1" style={{ height: 64 }} />
        <Skeleton className="flex-1" style={{ height: 64 }} />
        <Skeleton className="flex-1" style={{ height: 64 }} />
      </div>
      <Skeleton style={{ height: 12, width: 160, marginTop: 18, borderRadius: 6 }} />
      <Skeleton style={{ height: 56, marginTop: 10 }} />
      <Skeleton style={{ height: 56, marginTop: 8 }} />
    </main>
  );
}
