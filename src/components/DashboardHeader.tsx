// src/components/DashboardHeader.tsx
import { BrandMark } from "@/components/BrandMark";

export function DashboardHeader({ name }: { name: string }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[12.5px]" style={{ color: "var(--text-dim)" }}>
          Welcome back, {name}
        </p>
        <h1
          className="text-[25px] font-semibold mt-0.5"
          style={{ fontFamily: "var(--font-spectral)", color: "var(--text)" }}
        >
          Your week so far
        </h1>
      </div>
      <span aria-hidden="true" style={{ color: "var(--text-dim)" }}>
        <BrandMark variant="mono" size={22} className="opacity-70" />
      </span>
    </div>
  );
}
