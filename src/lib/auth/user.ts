import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type VerifiedUser = { id: string; email: string | null };

// The one place the application establishes who is signed in.
//
// getClaims verifies the access token's signature locally against the
// project's JWKS, which is cached in a module level global inside auth-js
// and so survives this app building a fresh client per request. That is what
// makes it cheaper than getUser, which asks the auth server every time.
//
// It is not a weaker check. When the algorithm is symmetric, the kid is
// missing, or WebCrypto is unavailable, getClaims falls back to a getUser
// round trip internally. The degraded path is exactly the old behaviour, so
// this can never degrade to trusting an unverified cookie.
export async function getVerifiedUser(): Promise<VerifiedUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  return { id: data.claims.sub, email: data.claims.email ?? null };
}

// For pages and actions that redirect an unauthenticated visitor. Callers
// that answer with an error object instead must use getVerifiedUser; the two
// are deliberately separate, because merging them would turn a returned
// error into a thrown redirect at every call site that returns one.
export async function requireUser(): Promise<VerifiedUser> {
  const user = await getVerifiedUser();
  if (!user) redirect("/sign-in");
  return user;
}
