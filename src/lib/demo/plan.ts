import type { DemoSeed } from "@/lib/demo/seed";

export type DemoWrite = {
  routines: { id: string; user_id: string; name: string }[];
  routine_exercises: {
    id: string;
    routine_id: string;
    exercise_id: string;
    order_index: number;
    default_sets: number;
  }[];
  workout_sessions: {
    id: string;
    user_id: string;
    routine_id: string;
    started_at: string;
    completed_at: string;
  }[];
  workout_sets: {
    id: string;
    session_id: string;
    exercise_id: string;
    set_number: number;
    reps: number;
    weight: number;
    rir_low: number | null;
    rir_high: number | null;
    logged_at: string;
  }[];
  goals: {
    id: string;
    user_id: string;
    exercise_id: string;
    target_weight: number;
    target_reps: number;
    status: string;
    achieved_at: string | null;
  }[];
};

/**
 * Turn the demo's content into flat rows, one array per table.
 *
 * Every id is generated here rather than read back after inserting, so the
 * tables can be written independently and in any order that satisfies the
 * foreign keys. Nothing in this function touches the database.
 */
export function planDemoWrite(
  seed: DemoSeed,
  exerciseIds: Map<string, string>,
  userId: string,
  uuid: () => string,
): DemoWrite {
  const resolve = (name: string): string => {
    const id = exerciseIds.get(name);
    // Loud on purpose: a missing name means the seed has drifted from the
    // default library, and a silent skip would half write the demo.
    if (!id) throw new Error(`Demo seed references unknown exercise: ${name}`);
    return id;
  };

  const write: DemoWrite = {
    routines: [],
    routine_exercises: [],
    workout_sessions: [],
    workout_sets: [],
    goals: [],
  };

  for (const r of seed.routines) {
    const routineId = uuid();
    write.routines.push({ id: routineId, user_id: userId, name: r.name });

    r.exercises.forEach((e, i) => {
      write.routine_exercises.push({
        id: uuid(),
        routine_id: routineId,
        exercise_id: resolve(e.name),
        order_index: i,
        default_sets: e.defaultSets,
      });
    });

    for (const s of r.sessions) {
      const sessionId = uuid();
      write.workout_sessions.push({
        id: sessionId,
        user_id: userId,
        routine_id: routineId,
        started_at: s.startedAt,
        completed_at: s.completedAt,
      });
      for (const set of s.sets) {
        write.workout_sets.push({
          id: uuid(),
          session_id: sessionId,
          exercise_id: resolve(set.exerciseName),
          set_number: set.setNumber,
          reps: set.reps,
          weight: set.weight,
          rir_low: set.rirLow,
          rir_high: set.rirHigh,
          logged_at: set.loggedAt,
        });
      }
    }
  }

  for (const g of seed.goals) {
    write.goals.push({
      id: uuid(),
      user_id: userId,
      exercise_id: resolve(g.exerciseName),
      target_weight: g.targetWeight,
      target_reps: g.targetReps,
      status: g.status,
      achieved_at: g.achievedAt,
    });
  }

  return write;
}
