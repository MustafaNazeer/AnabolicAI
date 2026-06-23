// src/components/dashboard/StatChip.tsx
import { Card } from "@/components/ui/Card";

export function StatChip({
  value,
  label,
  unit,
}: {
  value: string;
  label: string;
  unit?: string;
}) {
  return (
    <Card className="flex-1 p-3" style={{ borderRadius: "var(--radius-tile)" }}>
      <div
        className="text-[23px] font-semibold leading-none"
        style={{ fontFamily: "var(--font-spectral)", color: "var(--text)" }}
      >
        {value}
        {unit ? (
          <span
            className="text-[11px] font-semibold"
            style={{ fontFamily: "var(--font-geist-sans)", color: "var(--text-dim)" }}
          >
            {" "}
            {unit}
          </span>
        ) : null}
      </div>
      <div
        className="text-[9.5px] mt-1.5 uppercase tracking-[.06em]"
        style={{ color: "var(--text-dim)" }}
      >
        {label}
      </div>
    </Card>
  );
}
