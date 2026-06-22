import { Flame, Trophy } from "lucide-react";
import { getDashboardData } from "@/lib/progress/queries";
import { formatCompact } from "@/lib/progress/strength";
import { createClient } from "@/lib/supabase/server";

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-xl px-4 py-3" style={{ background: "var(--surface)" }}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
        {label}
      </div>
    </div>
  );
}

export default async function HomePage() {
  const data = await getDashboardData();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = user?.email?.split("@")[0] ?? "there";

  return (
    <main className="px-5 pt-12 pb-24">
      <h1 className="text-2xl font-bold">Welcome back, {name}</h1>
      <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
        Here is your week so far.
      </p>

      <div className="flex gap-3 mt-6">
        <Tile value={`${data.weekly.workouts}`} label="Workouts" />
        <Tile value={`${data.weekly.sets}`} label="Sets" />
        <Tile value={`${formatCompact(data.weekly.volume)}`} label="Volume (lbs)" />
      </div>

      <div
        className="flex items-center gap-2 mt-4 rounded-xl px-4 py-3"
        style={{ background: "var(--surface)" }}
      >
        <Flame size={18} aria-hidden style={{ color: "var(--accent)" }} />
        <span className="font-medium">
          {data.streakWeeks > 0
            ? `${data.streakWeeks} week streak`
            : "No streak yet, train this week to start one"}
        </span>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Recent personal records</h2>
        {data.prs.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            Keep logging. New bests show up here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.prs.map((pr) => (
              <li
                key={`${pr.exerciseId}-${pr.loggedAt}`}
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: "var(--surface)" }}
              >
                <Trophy size={18} aria-hidden style={{ color: "var(--accent)" }} />
                <span className="text-sm">
                  New best: {pr.exerciseName} {pr.weight} lbs x {pr.reps}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Recent workouts</h2>
        {data.recent.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            No workouts yet. Start one from the Log tab.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.recent.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: "var(--surface)" }}
              >
                <div>
                  <div className="font-medium">{w.routineName}</div>
                  <div className="text-xs" style={{ color: "var(--text-dim)" }}>
                    {shortDate(w.completedAt)}
                  </div>
                </div>
                <div className="text-xs text-right" style={{ color: "var(--text-dim)" }}>
                  {w.sets} sets
                  <br />
                  {formatCompact(w.volume)} lbs
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
