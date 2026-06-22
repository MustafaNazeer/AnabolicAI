"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

type Mode = "sign-in" | "sign-up";
type Result = { error?: string; ok?: boolean } | void;

export function AuthForm({
  mode,
  action,
}: {
  mode: Mode;
  action: (formData: FormData) => Promise<Result>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const title = mode === "sign-in" ? "Sign in" : "Create account";
  const altHref = mode === "sign-in" ? "/sign-up" : "/sign-in";
  const altLabel =
    mode === "sign-in" ? "Create an account" : "I already have an account";

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else if (result && "ok" in result && result.ok) {
        setSent(true);
      }
    });
  }

  if (sent) {
    return (
      <main className="px-5 pt-16 pb-24 max-w-sm mx-auto">
        <h1 className="text-3xl font-bold mb-2">Onyx</h1>
        <p style={{ color: "var(--text-dim)" }}>
          Check your email for a confirmation link, then sign in.
        </p>
        <Link
          href="/sign-in"
          className="block mt-6 text-sm"
          style={{ color: "var(--accent)" }}
        >
          Back to sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="px-5 pt-16 pb-24 max-w-sm mx-auto">
      <h1 className="text-3xl font-bold mb-1">Onyx</h1>
      <p style={{ color: "var(--text-dim)" }} className="mb-8">
        {title}
      </p>
      <form action={onSubmit} className="flex flex-col gap-4">
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Email"
          required
          className="rounded-xl px-4 py-3 outline-none"
          style={{ background: "var(--surface)", color: "var(--text)", minHeight: 48 }}
        />
        <input
          name="password"
          type="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          placeholder="Password"
          required
          className="rounded-xl px-4 py-3 outline-none"
          style={{ background: "var(--surface)", color: "var(--text)", minHeight: 48 }}
        />
        {error ? (
          <p role="alert" style={{ color: "var(--accent)" }} className="text-sm">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl font-semibold py-3 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "#08090b", minHeight: 48 }}
        >
          {pending ? "Please wait" : title}
        </button>
      </form>
      <Link
        href={altHref}
        className="block mt-6 text-sm"
        style={{ color: "var(--text-dim)" }}
      >
        {altLabel}
      </Link>
    </main>
  );
}
