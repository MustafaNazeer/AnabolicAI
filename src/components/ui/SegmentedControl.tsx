"use client";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="flex gap-[5px] p-1"
      style={{ background: "rgba(0,0,0,0.25)", borderRadius: 12 }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className="flex-1 text-[11px] font-semibold"
            style={{
              borderRadius: 9,
              padding: "7px 4px",
              background: active ? "var(--accent)" : "transparent",
              color: active ? "var(--on-accent)" : "var(--text-dim)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
