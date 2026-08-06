/**
 * Which account each browser project runs as.
 *
 * Separate accounts exist because `startSession` resumes any session with a
 * null completed_at regardless of routine, so a workout left open by one
 * browser would be inherited by the other.
 *
 * This throws rather than returning an error, because the reset it feeds
 * deletes four tables for whatever account it is handed. Every way of arriving
 * at the wrong address is refused here rather than discovered afterwards.
 */

export type E2eProject = "chromium" | "webkit";

export type E2eAccount = { email: string; password: string };

const EMAIL_VAR: Record<E2eProject, string> = {
  chromium: "E2E_EMAIL_CHROMIUM",
  webkit: "E2E_EMAIL_WEBKIT",
};

export function resolveE2eAccount(
  env: Record<string, string | undefined>,
  project: E2eProject,
): E2eAccount {
  const variable = EMAIL_VAR[project];
  const email = env[variable]?.trim();
  const password = env.E2E_PASSWORD?.trim();

  if (!email) {
    throw new Error(`${variable} is not set. Add it to .env.local.`);
  }
  if (!password) {
    throw new Error("E2E_PASSWORD is not set. Add it to .env.local.");
  }

  const demo = env.DEMO_EMAIL?.trim();
  if (demo && email.toLowerCase() === demo.toLowerCase()) {
    throw new Error(
      `${variable} is the demo account. Resetting it would wipe the public demo.`,
    );
  }

  const other: E2eProject = project === "chromium" ? "webkit" : "chromium";
  const otherEmail = env[EMAIL_VAR[other]]?.trim();
  if (otherEmail && email.toLowerCase() === otherEmail.toLowerCase()) {
    throw new Error(
      `${variable} and ${EMAIL_VAR[other]} are the same account. ` +
        "Each browser needs its own, or one run wipes the other's data.",
    );
  }

  return { email, password };
}
