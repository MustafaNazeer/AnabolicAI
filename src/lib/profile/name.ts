// Mirrors display_name_length in 0022. Checked here too, so a name one
// character too long comes back in this app's words rather than as a raw
// constraint violation from Postgres.
export const MAX_DISPLAY_NAME = 40;

// What to call this person on screen.
//
// FALLS BACK TO THE EMAIL'S LOCAL PART, which is what the app showed everyone
// before there was anywhere to put a real name, so an account that never
// answers the prompt reads exactly as it did before.
export function greetingName(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  const local = email?.split("@")[0]?.trim();
  return local || "there";
}

// Whether to ask at all.
//
// KEYED ON NULL RATHER THAN ON EMPTY. Never asked is null; asked and declined
// is an empty string. Treating those alike would turn a one time question into
// a permanent one.
export function needsName(displayName: string | null | undefined): boolean {
  return displayName === null || displayName === undefined;
}

export function parseDisplayName(
  raw: string,
): { name: string } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "Tell me what to call you." };
  if (trimmed.length > MAX_DISPLAY_NAME) return { error: "That name is too long." };
  return { name: trimmed };
}
