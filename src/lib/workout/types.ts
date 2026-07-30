import type { Exercise } from "@/lib/data/types";
import type { Swap } from "@/lib/workout/swap";

export type LoggedSet = {
  id: string;
  set_number: number;
  reps: number;
  weight: number;
  rirLow: number | null;
  rirHigh: number | null;
};

export type SessionExercise = {
  exercise: Exercise;
  defaultSets: number;
  loggedSets: LoggedSet[];
};

export type SessionDetail = {
  id: string;
  routineName: string;
  startedAt: string;
  exercises: SessionExercise[];
  swaps: Swap[];
  setTimes: string[];
};

export type LastSet = {
  set_number: number;
  reps: number;
  weight: number;
  rirLow: number | null;
  rirHigh: number | null;
};
