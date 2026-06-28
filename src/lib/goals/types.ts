export type GoalStatus = "active" | "achieved";

export type Goal = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  targetWeight: number;
  targetReps: number;
  status: GoalStatus;
  createdAt: string;
  achievedAt: string | null;
};

export type GoalWithProgress = Goal & {
  pct: number;
  lbsToGo: number;
  reached: boolean;
};
