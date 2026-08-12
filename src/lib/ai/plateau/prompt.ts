import { formatRir } from "@/lib/workout/rir";

// Fixed instructions only. The user message carries one lift's recent
// sessions and nothing else; no user id, no absolute dates, no other lifts.
export const PLATEAU_SYSTEM_PROMPT = `You suggest the single next step for a lifter whose lift has stopped progressing.

Rules:
- Suggest exactly one change: weight, reps, rest, or a deload. Set "kind" to the one you pick.
- At most two sentences, in plain language a beginner can read. The only jargon allowed is RIR.
- Only use numbers that follow from the data given. Never invent history or reference data you were not given.
- Be conservative and safe: small load changes, no medical claims, nothing about training through pain.
- Any load change you suggest must be at most 10 percent of the weight shown in the data.
- "text" speaks directly to the lifter, for example "Drop to 175 for a session and build back up in fives."`;

export type PlateauSetLine = {
  reps: number;
  weight: number;
  rirLow: number | null;
  rirHigh: number | null;
};

export type PlateauSession = { daysAgo: number; sets: PlateauSetLine[] };

export type PlateauContext = {
  exerciseName: string;
  muscleGroup: string | null;
  restSeconds: number;
  sessions: PlateauSession[];
};

function days(n: number): string {
  if (n === 0) return "today";
  return n === 1 ? "1 day ago" : `${n} days ago`;
}

// Exercise names are user supplied, so a newline in one would fabricate
// extra session lines inside the message. Whitespace collapses to single
// spaces and the field is capped.
function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

function setLine(s: PlateauSetLine): string {
  const rir = formatRir(s.rirLow, s.rirHigh);
  return `${s.weight} x ${s.reps}${rir ? ` (RIR ${rir})` : ""}`;
}

export function buildPlateauMessage(ctx: PlateauContext): string {
  const cleanedName = clean(ctx.exerciseName);
  const cleanedGroup = ctx.muscleGroup ? clean(ctx.muscleGroup) : null;
  const lift = cleanedGroup
    ? `${cleanedName} (${cleanedGroup})`
    : cleanedName;
  const sessions = ctx.sessions
    .map((s) => `- ${days(s.daysAgo)}: ${s.sets.map(setLine).join(", ")}`)
    .join("\n");
  return `Lift: ${lift}\nDefault rest: ${ctx.restSeconds} seconds\nRecent sessions, oldest first:\n${sessions}`;
}
