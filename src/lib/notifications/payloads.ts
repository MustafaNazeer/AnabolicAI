import { formatCompact } from "@/lib/progress/strength";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

export function prCelebrationPayload(
  name: string,
  weight: number,
  reps: number,
): PushPayload {
  return {
    title: "New personal record",
    body: `${name}: ${weight} lbs x ${reps}`,
    url: "/",
    tag: "pr",
  };
}

export function workoutReminderPayload(): PushPayload {
  return {
    title: "Time to train",
    body: "You have a workout scheduled today. Open Onyx to start.",
    url: "/",
    tag: "reminder",
  };
}

export function streakWarningPayload(weeks: number): PushPayload {
  return {
    title: "Keep your streak",
    body: `Your ${weeks}-week streak ends tonight. Log a workout today to keep it going.`,
    url: "/",
    tag: "streak",
  };
}

export function weeklyRecapPayload(workouts: number, volume: number): PushPayload {
  return {
    title: "This week in Onyx",
    body: `${workouts} workouts, ${formatCompact(volume)} lbs moved. Nice work.`,
    url: "/",
    tag: "weekly",
  };
}

export function unfinishedWorkoutPayload(
  routineName: string,
  sessionId: string,
): PushPayload {
  return {
    title: "Workout still open",
    body: `${routineName} is still open. Finish it or clear it out.`,
    url: `/log/${sessionId}`,
    tag: "unfinished",
  };
}

export function goalReachedPayload(
  name: string,
  weight: number,
  reps: number,
): PushPayload {
  return {
    title: "Goal reached",
    body: `${name}: ${weight} lbs x ${reps}. Time to set a new one.`,
    url: "/progress",
    tag: "goal-reached",
  };
}

export function goalProximityPayload(
  name: string,
  lbsToGo: number,
  reps: number,
): PushPayload {
  return {
    title: "Almost there",
    body: `${name}: about ${lbsToGo} lbs to go at ${reps} reps.`,
    url: "/progress",
    tag: "goal-near",
  };
}

export function newAccountPayload(email: string): PushPayload {
  return {
    title: "New account",
    body: `${email} signed up and is waiting for approval.`,
    url: "/settings/accounts",
    tag: "new-account",
  };
}

export function restCompletePayload(): PushPayload {
  return {
    title: "Rest's over",
    body: "Hit your next set.",
    url: "/log",
    // The service worker suppresses only this tag while the app is visible,
    // since the local beep has already played.
    tag: "rest",
  };
}
