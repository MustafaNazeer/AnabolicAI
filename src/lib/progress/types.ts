import type { PersonalRecord } from "@/lib/progress/prs";

export type WeeklySummary = {
  workouts: number;
  sets: number;
  volume: number;
};

export type RecentWorkout = {
  id: string;
  routineName: string;
  completedAt: string;
  sets: number;
  volume: number;
};

export type DashboardData = {
  weekly: WeeklySummary;
  streakWeeks: number;
  recent: RecentWorkout[];
  prs: PersonalRecord[];
};

export type ProgressPoint = {
  sessionId: string;
  date: string;
  maxWeight: number;
  e1rm: number;
  volume: number;
  topSetReps: number;
};

export type ProgressData = {
  exercises: { id: string; name: string }[];
  series: Record<string, ProgressPoint[]>;
};

export type RoutineVolumePoint = {
  sessionId: string;
  date: string;
  total: number;
  byExercise: Record<string, number>;
};

export type RoutineVolumeData = {
  routines: { id: string; name: string }[];
  series: Record<
    string,
    {
      exercises: { id: string; name: string }[];
      points: RoutineVolumePoint[];
    }
  >;
};
