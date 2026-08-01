/**
 * The demo account's contents, as data.
 *
 * Every timestamp is derived from the `now` passed in, never hardcoded. The
 * progress screens window on recent activity, so fixed dates would look correct
 * on the day they were written and then drain away, leaving a visitor months
 * later looking at empty charts.
 */

export type DemoSet = {
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: number;
  rirLow: number | null;
  rirHigh: number | null;
  loggedAt: string;
};
export type DemoSession = {
  startedAt: string;
  completedAt: string;
  sets: DemoSet[];
};
export type DemoRoutine = {
  name: string;
  exercises: { name: string; defaultSets: number }[];
  sessions: DemoSession[];
};
export type DemoGoal = {
  exerciseName: string;
  targetWeight: number;
  targetReps: number;
  status: "active" | "achieved";
  achievedAt: string | null;
};
export type DemoSeed = { routines: DemoRoutine[]; goals: DemoGoal[] };

const DAY = 24 * 60 * 60 * 1000;
const WEEKS = 8;

// Every name here is a default exercise from supabase/seed.sql. A name that is
// not in that list resolves to no id and the insert fails.
const ROUTINES: {
  name: string;
  exercises: {
    name: string;
    defaultSets: number;
    startWeight: number;
    perWeek: number;
    reps: number;
  }[];
}[] = [
  {
    name: "Push Day",
    exercises: [
      { name: "Bench Press", defaultSets: 4, startWeight: 135, perWeek: 5, reps: 8 },
      { name: "Overhead Press", defaultSets: 3, startWeight: 75, perWeek: 2.5, reps: 8 },
      { name: "Incline Bench Press", defaultSets: 3, startWeight: 95, perWeek: 2.5, reps: 10 },
      { name: "Tricep Pushdown", defaultSets: 3, startWeight: 40, perWeek: 2.5, reps: 12 },
    ],
  },
  {
    name: "Pull Day",
    exercises: [
      { name: "Deadlift", defaultSets: 3, startWeight: 185, perWeek: 10, reps: 5 },
      { name: "Barbell Row", defaultSets: 4, startWeight: 115, perWeek: 5, reps: 8 },
      { name: "Lat Pulldown", defaultSets: 3, startWeight: 100, perWeek: 2.5, reps: 10 },
      { name: "Barbell Curl", defaultSets: 3, startWeight: 50, perWeek: 2.5, reps: 12 },
    ],
  },
  {
    name: "Leg Day",
    exercises: [
      { name: "Squat", defaultSets: 4, startWeight: 155, perWeek: 7.5, reps: 6 },
      { name: "Romanian Deadlift", defaultSets: 3, startWeight: 135, perWeek: 5, reps: 8 },
      { name: "Leg Press", defaultSets: 3, startWeight: 270, perWeek: 10, reps: 10 },
      { name: "Leg Curl", defaultSets: 3, startWeight: 70, perWeek: 2.5, reps: 12 },
    ],
  },
];

// Reps in reserve, cycled rather than random so the output is deterministic and
// still varied. Index 2 is a null pair, standing for a set logged without one.
const RIR_CYCLE: [number | null, number | null][] = [
  [1, 2],
  [0, 1],
  [null, null],
  [2, 2],
];

export function buildDemoSeed(now: Date): DemoSeed {
  const routines: DemoRoutine[] = ROUTINES.map((r) => ({
    name: r.name,
    exercises: r.exercises.map((e) => ({ name: e.name, defaultSets: e.defaultSets })),
    sessions: [],
  }));

  // 24 sessions, three a week for eight weeks, cycling push, pull, legs. The
  // most recent lands one day before now so the dashboard always looks current.
  let slot = 0;
  for (let week = WEEKS - 1; week >= 0; week--) {
    for (let inWeek = 0; inWeek < 3; inWeek++) {
      const routineIndex = slot % 3;
      const r = ROUTINES[routineIndex];
      // Oldest first: week WEEKS-1 is furthest back.
      const daysAgo = week * 7 + (2 - inWeek) * 2 + 1;
      const startedAt = new Date(now.getTime() - daysAgo * DAY);
      const weeksElapsed = WEEKS - 1 - week;

      const sets: DemoSet[] = [];
      let offset = 0;
      for (const e of r.exercises) {
        const weight = e.startWeight + e.perWeek * weeksElapsed;
        for (let n = 1; n <= e.defaultSets; n++) {
          const [rirLow, rirHigh] = RIR_CYCLE[(slot + n) % RIR_CYCLE.length];
          sets.push({
            exerciseName: e.name,
            setNumber: n,
            // The last set of each exercise drops a rep, which is what actually
            // happens and keeps the data from looking generated.
            reps: n === e.defaultSets ? e.reps - 1 : e.reps,
            weight,
            rirLow,
            rirHigh,
            loggedAt: new Date(
              startedAt.getTime() + offset * 3 * 60 * 1000,
            ).toISOString(),
          });
          offset++;
        }
      }

      routines[routineIndex].sessions.push({
        startedAt: startedAt.toISOString(),
        completedAt: new Date(startedAt.getTime() + 55 * 60 * 1000).toISOString(),
        sets,
      });
      slot++;
    }
  }

  const goals: DemoGoal[] = [
    // Ahead of the current working weight, so it reads as something being
    // trained towards.
    {
      exerciseName: "Bench Press",
      targetWeight: 225,
      targetReps: 5,
      status: "active",
      achievedAt: null,
    },
    {
      exerciseName: "Squat",
      targetWeight: 185,
      targetReps: 5,
      status: "achieved",
      achievedAt: new Date(now.getTime() - 10 * DAY).toISOString(),
    },
  ];

  return { routines, goals };
}
