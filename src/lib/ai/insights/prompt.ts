import { formatRir } from "@/lib/workout/rir";

// Fixed instructions only. The user message carries up to five lifts (name,
// muscle group, the app's own verdict words, recent sessions) and the week's
// workout, set, and streak counts, and nothing else; no user id, no absolute
// dates, no account details. This comment is a claim the tests check against
// the built message; keep it true.
export const INSIGHTS_SYSTEM_PROMPT = `You write short observations about a lifter's recent training.

Rules:
- Return one to three observations. Each is a single sentence in plain language a beginner can read. The only jargon allowed is RIR.
- Ground every observation in the data given. Never invent history, numbers, or lifts you were not shown.
- The trend and stall lines were computed by the app's statistics. Only call a lift stalled or declining when its stall check says so, and do not suggest a fix for a stalled lift; the app's Progress screen owns that.
- No greetings, no headers, no medical claims, nothing about training through pain, no supplement advice.
- Speak directly to the lifter, for example "Your bench press has held steady while your weekly volume went up."`;

export type InsightSetLine = {
  reps: number;
  weight: number;
  rirLow: number | null;
  rirHigh: number | null;
};

export type InsightSession = { daysAgo: number; sets: InsightSetLine[] };

export type InsightLift = {
  name: string;
  muscleGroup: string | null;
  trendWord: string;
  stallCheck: string;
  sessions: InsightSession[];
};

export type InsightsContext = {
  lifts: InsightLift[];
  weeklyWorkouts: number;
  weeklySets: number;
  streakWeeks: number;
};

function days(n: number): string {
  if (n === 0) return "today";
  return n === 1 ? "1 day ago" : `${n} days ago`;
}

// Exercise names are user supplied, so a newline in one would fabricate
// extra message lines. Whitespace collapses to single spaces and the field
// is capped. Same rule, same reasoning as the plateau prompt.
function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

function setLine(s: InsightSetLine): string {
  const rir = formatRir(s.rirLow, s.rirHigh);
  return `${s.weight} x ${s.reps}${rir ? ` (RIR ${rir})` : ""}`;
}

export function buildInsightsMessage(ctx: InsightsContext): string {
  const lifts = ctx.lifts
    .map((lift) => {
      const name = clean(lift.name);
      const head = lift.muscleGroup
        ? `${name} (${clean(lift.muscleGroup)})`
        : name;
      const sessions = lift.sessions
        .map((s) => `- ${days(s.daysAgo)}: ${s.sets.map(setLine).join(", ")}`)
        .join("\n");
      return `Lift: ${head}\nTrend: ${lift.trendWord}\nStall check: ${lift.stallCheck}\nRecent sessions, oldest first:\n${sessions}`;
    })
    .join("\n\n");
  return `${lifts}\n\nThis week: ${ctx.weeklyWorkouts} workouts, ${ctx.weeklySets} sets. Streak: ${ctx.streakWeeks} weeks.`;
}
