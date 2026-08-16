"use client";

import { setWeekPlanner } from "@/lib/planner/actions";
import { AiToggle } from "@/components/AiToggle";

// Lives on the Settings screen but renders only for an admin, the same way the
// Accounts link beside it does. It flips the caller's own gate so the planner
// can be looked at on a real account rather than only in tests.
//
// The shared row component is named for the AI section it was written for, but
// it is already the generic settings row: NewAccountNotificationToggle uses it
// for something with no AI in it at all. Reused rather than copied so this row
// keeps matching the ones above it as they change.
//
// THE SWITCH IS NOT THE PROTECTION. It is hidden from everyone else, but the
// action behind it checks admin identity itself, because a server action is a
// public endpoint and hiding a control removes it from the screen and nothing
// more.
export function WeekPlannerToggle({ initial }: { initial: boolean }) {
  return (
    <AiToggle
      label="Week planner"
      description="Log days by category and read the week back as a calendar."
      initial={initial}
      save={setWeekPlanner}
    />
  );
}
