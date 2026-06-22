import type { Exercise } from "@/lib/data/types";

export type LoggedSet = {
  id: string;
  set_number: number;
  reps: number;
  weight: number;
  rir: number;
};

export type SessionExercise = {
  exercise: Exercise;
  defaultSets: number;
  loggedSets: LoggedSet[];
};

export type SessionDetail = {
  id: string;
  routineName: string;
  exercises: SessionExercise[];
};

export type LastSet = {
  set_number: number;
  reps: number;
  weight: number;
  rir: number;
};
