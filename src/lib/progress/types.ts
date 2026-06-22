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
};

export type ProgressData = {
  exercises: { id: string; name: string }[];
  series: Record<string, ProgressPoint[]>;
};
