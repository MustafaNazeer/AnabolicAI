import { isEmailAllowed } from "@/lib/auth/allowlist";

// Admin identity comes from the environment, never from the database, so there
// is no path by which the application can grant it to itself. The list takes
// the same comma separated shape as ALLOWED_EMAILS and reuses its parser, which
// already trims, lowercases and refuses an empty list.
export function isAdminEmail(
  email: string | null,
  admins: string | undefined,
): boolean {
  if (!email) return false;
  return isEmailAllowed(email, admins);
}

// Exactly "true" opens signup. Everything else, including unset, leaves the app
// invite only. A variable that is misspelled, half set, or set to a truthy
// looking value must not open the door.
export function isOpenSignup(value: string | undefined): boolean {
  return value === "true";
}

// The one question the three paid features ask. A missing row counts as not
// approved: an empty or failed read must never read as permission to spend.
export function canUseAi(
  settings: { approved: boolean } | null | undefined,
): boolean {
  return settings?.approved === true;
}
