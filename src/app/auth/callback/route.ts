import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isChunkLike } from "@supabase/ssr";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailAllowed } from "@/lib/auth/allowlist";

const REJECTED = "/sign-in?error=not-invited";

// The name the Supabase client derives for its auth cookie. supabase-js builds
// it from the first label of the project hostname, so reading the configured
// URL gives the same answer without a project ref written down here. A value
// too large for one cookie is split into chunks named key.0, key.1 and so on.
function authCookieKey(): string | null {
  try {
    const { hostname } = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return `sb-${hostname.split(".")[0]}-auth-token`;
  } catch {
    return null;
  }
}

// Expire the session cookies on the response itself. Two things make this the
// right place. The client hands back its error before it clears the session,
// so after a failed sign out the cookies are still live. And cookies set on a
// returned response are applied after the ones written through next/headers,
// so this overrides the session exchangeCodeForSession just wrote rather than
// racing it.
async function expireAuthCookies(response: NextResponse): Promise<void> {
  const key = authCookieKey();
  if (!key) return;

  // The base name plus whichever chunks exist, matched with the library's own
  // predicate so the chunk naming is not reimplemented here.
  const names = new Set([key]);
  for (const { name } of (await cookies()).getAll()) {
    if (isChunkLike(name, key)) names.add(name);
  }
  for (const name of names) {
    response.cookies.set(name, "", { maxAge: 0, path: "/" });
  }
}

// Whether this account owns anything at all. Only a genuinely empty account
// may be deleted on the reject path, because auth.users cascades to routines,
// sessions, sets, settings, push subscriptions and custom exercises. An
// account with history that is refused today may simply have been dropped
// from ALLOWED_EMAILS, and that must never destroy their data.
//
// Six tables cascade from auth.users. Five of them are counted below:
// routines, workout_sessions, exercises, goals and push_subscriptions.
// user_settings is the sixth and is deliberately left out, because the
// handle_new_user trigger inserts a row there for every account at signup, so
// counting it would make every account look occupied and this delete would
// become dead code that never fires.
//
// All five are counted, including the ones whose data is cheap to lose. This
// check is a safety interlock, so its failure mode has to be refusing to
// delete, never deleting something. Counting the cheap ones costs the intended
// path nothing: the account this route is built to remove was created seconds
// earlier by an uninvited provider redirect and owns zero rows in all five.
async function ownsData(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<boolean> {
  for (const table of [
    "routines",
    "workout_sessions",
    "exercises",
    "goals",
    "push_subscriptions",
  ]) {
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
  //
  // The sign out is the whole of the enforcement. The allowlist is consulted
  // here and when a password account signs up, never again per request, and
  // the account this route is most careful about is deliberately left in
  // place. So a sign out that failed must not be reported as a refusal that
  // took effect, or a refused visitor keeps a live session and walks back in.
  const { error: signOutError } = await supabase.auth.signOut();
  const admin = createAdminClient();
  if (!(await ownsData(admin, data.user.id))) {
    await admin.auth.admin.deleteUser(data.user.id);
  }

  const response = NextResponse.redirect(new URL(REJECTED, request.url));
  if (signOutError) await expireAuthCookies(response);
  return response;
}
