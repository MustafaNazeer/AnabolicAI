import { balanceCounts, type PlannerDay } from "@/lib/planner/week";

// What the week actually held, counted by category.
//
// THE EXCLUSION OF PLANNED DAYS IS NOT RE-DERIVED HERE. balanceCounts owns that
// rule and is tested on it directly; a second copy of it in this file is a
// second place for the two to disagree about what a workout is.
export function PlannerBalance({
  days,
  categoryNames,
}: {
  days: PlannerDay[];
  categoryNames: Record<string, string>;
}) {
  const counts = Object.entries(balanceCounts(days));

  return (
    <section className="mt-3.5">
      <h2
        className="text-[10.5px] uppercase tracking-[.11em] mb-2.5"
        style={{ color: "var(--text-dim)" }}
      >
        This week by category
      </h2>
      {counts.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Nothing logged this week yet.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {counts.map(([id, count]) => (
            <li
              key={id}
              data-testid={`balance-${id}`}
              className="flex items-center gap-2 px-3 py-1.5 border"
              style={{
                borderRadius: "var(--radius-square)",
                background: "var(--surface)",
                borderColor: "var(--surface-border)",
                color: "var(--text)",
              }}
            >
              <span className="text-[13px]">{categoryNames[id] ?? "Unknown"}</span>
              <span
                className="text-[13px] font-semibold"
                style={{ fontFamily: "var(--font-spectral)", color: "var(--accent)" }}
              >
                {count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
