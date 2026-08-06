import { createClient } from "@supabase/supabase-js";
import { resetDemoAccount, supabaseDemoDb } from "@/lib/demo/reset";
import { resolveE2eAccount, type E2eProject } from "./accounts";

/**
 * Wipe and reseed one browser project's account.
 *
 * The client is built here rather than imported from @/lib/supabase/admin,
 * which carries `import "server-only"` and therefore cannot load outside the
 * Next runtime. The options match that module so the two behave identically.
 *
 * resetDemoAccount is used unchanged. It already takes the email as a
 * parameter rather than reading DEMO_EMAIL itself, which is the whole reason
 * this needs no new seeding code.
 */
export async function resetE2eAccount(project: E2eProject): Promise<string> {
  const { email } = resolveE2eAccount(process.env, project);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set in .env.local.",
    );
  }

  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const result = await resetDemoAccount(supabaseDemoDb(admin), email, new Date());
  if (!result.ok) {
    throw new Error(
      `Could not reset ${email}: ${result.reason}. The account most likely does not ` +
        "exist yet. Create it in the Supabase dashboard under Authentication, Users, " +
        "and make sure it is marked confirmed.",
    );
  }
  return email;
}
