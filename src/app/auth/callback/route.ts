import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailAllowed } from "@/lib/auth/allowlist";

const REJECTED = "/sign-in?error=not-invited";

// Whether this account owns anything at all. Only a genuinely empty account
// may be deleted on the reject path, because auth.users cascades to routines,
// sessions, sets, settings, push subscriptions and custom exercises. An
// account with history that is refused today may simply have been dropped
// from ALLOWED_EMAILS, and that must never destroy their data.
async function ownsData(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<boolean> {
  for (const table of ["routines", "workout_sessions", "exercises"]) {
    const { count, error } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    // Unknown is treated as owning data, so a failed count never authorises
    // a delete. Postgrest answers a broken query with a null count, so reading
    // a missing number as zero would delete an account whose history merely
    // could not be read. Only a real number counts as an answer.
    if (error || typeof count !== "number") return true;
    if (count > 0) return true;
  }
  // Every table answered, and every answer was zero. That is the only state
  // this function is willing to call empty.
  return false;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/sign-in", request.url));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const email = data.user.email ?? "";
  if (isEmailAllowed(email, process.env.ALLOWED_EMAILS)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Refused. Sign out always; delete only if there is provably nothing to
  // lose. A rejected account holding history is left for a human to look at.
  await supabase.auth.signOut();
  const admin = createAdminClient();
  if (!(await ownsData(admin, data.user.id))) {
    await admin.auth.admin.deleteUser(data.user.id);
  }
  return NextResponse.redirect(new URL(REJECTED, request.url));
}
