"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateCredentials } from "@/lib/auth/validation";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { checkRateLimit, clientIpFrom, limitMessage } from "@/lib/security/rateLimit";

async function clientIp(): Promise<string> {
  return clientIpFrom((await headers()).get("x-forwarded-for"));
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const invalid = validateCredentials(email, password);
  if (invalid) return { error: invalid };
  if (!(await checkRateLimit("signIn", await clientIp()))) {
    return { error: limitMessage("signIn") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const invalid = validateCredentials(email, password);
  if (invalid) return { error: invalid };
  if (!(await checkRateLimit("signUp", await clientIp()))) {
    return { error: limitMessage("signUp") };
  }
  if (!isEmailAllowed(email, process.env.ALLOWED_EMAILS)) {
    return { error: "This email is not on the invite list." };
  }

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function signInAsDemo() {
  if (!(await checkRateLimit("demo", await clientIp()))) {
    return { error: limitMessage("demo") };
  }

  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  // Both are server only and must never be prefixed NEXT_PUBLIC_, or the demo
  // password would be shipped to every browser that loads the sign in page.
  if (!email || !password) return { error: "The demo is not available." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

export async function signInWithProvider(provider: "google" | "github") {
  if (!(await checkRateLimit("oauth", await clientIp()))) {
    return { error: limitMessage("oauth") };
  }

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    // The allowlist cannot be applied here, because the account is created
    // by Supabase during the redirect and this action has already returned.
    // The callback route is the only place that can refuse one.
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) return { error: "Could not start sign in." };
  redirect(data.url);
}
