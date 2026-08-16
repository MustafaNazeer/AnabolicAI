// Whether this account sees the week planner: category first day logging, the
// weekly calendar, and the balance summary that goes with them.
//
// THIS IS A GATE, NOT A PREFERENCE, and that is the one thing to keep straight
// about it. ai_visible is its owner's own choice and is granted to
// authenticated for exactly that reason. week_planner is set by an admin
// through the service role, is deliberately ungranted, and decides whether a
// whole alternate spine exists for that account. Turning it into a preference
// would let any signed in account switch itself into an unfinished surface by
// posting straight to PostgREST.
//
// A missing or failed read is OFF. canUseAi takes the same position on
// approval, and for the same reason: an empty result is not permission.
export function hasWeekPlanner(
  settings: { week_planner: boolean } | null | undefined,
): boolean {
  return settings?.week_planner === true;
}
