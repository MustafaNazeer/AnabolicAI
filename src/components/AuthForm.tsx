"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import { BrandMark } from "@/components/BrandMark";

type Mode = "sign-in" | "sign-up";
type Result = { error?: string; ok?: boolean } | void;

const inputStyle = {
  background: "var(--surface)",
  border: "1px solid var(--surface-border)",
  borderRadius: "var(--radius-tile)",
  color: "var(--text)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  minHeight: 48,
} as const;

export function AuthForm({
  mode,
  action,
  demoAction,
  notice,
}: {
  mode: Mode;
  action: (formData: FormData) => Promise<Result>;
  demoAction?: () => Promise<Result>;
  // A message about something that already happened, such as a provider sign
  // in the callback route refused. It is not tied to a submission, so unlike
  // the inline error it offers no retry; it only carries the styling.
  notice?: string;
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

  function onDemo() {
    setError(null);
    startTransition(async () => {
      const result = await demoAction?.();
      if (result && "error" in result && result.error) setError(result.error);
    });
  }

  if (sent) {
    return (
      <main className="px-5 pt-16 pb-24 max-w-sm mx-auto">
        <div aria-hidden="true" className="flex justify-center mb-3">
          <BrandMark size={56} />
        </div>
        <h1
          className="text-4xl font-semibold mb-2"
          style={{ fontFamily: "var(--font-spectral)", color: "var(--text)" }}
        >
          Onyx
        </h1>
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
      <div aria-hidden="true" className="flex justify-center mb-3">
        <BrandMark size={56} />
      </div>
      <h1
        className="text-4xl font-semibold mb-1"
        style={{ fontFamily: "var(--font-spectral)", color: "var(--text)" }}
      >
        Onyx
      </h1>
      <p style={{ color: "var(--text-dim)" }} className="mb-8">
        {title}
      </p>
      {notice ? (
        <p
          role="alert"
          className="px-3 py-2 mb-4 text-sm"
          style={{
            background: "var(--surface-sunken)",
            border: "1px solid var(--surface-border)",
            borderRadius: "var(--radius-square)",
            color: "var(--text)",
          }}
        >
          {notice}
        </p>
      ) : null}
      <form action={onSubmit} className="flex flex-col gap-4">
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Email"
          required
          className="px-4 py-3"
          style={inputStyle}
        />
        <input
          name="password"
          type="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          placeholder="Password"
          required
          className="px-4 py-3"
          style={inputStyle}
        />
        {error ? (
          <ErrorRetry
            message={error}
            pending={pending}
            onRetry={() => {
              const form = document.querySelector("form");
              if (form) onSubmit(new FormData(form));
            }}
          />
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="font-semibold py-3 disabled:opacity-60"
          style={{
            background: "var(--accent)",
            color: "var(--on-accent)",
            borderRadius: "var(--radius-tile)",
            minHeight: 48,
          }}
        >
          {pending ? "Please wait" : title}
        </button>
      </form>
      {mode === "sign-in" && demoAction ? (
        <button
          type="button"
          onClick={onDemo}
          disabled={pending}
          className="w-full mt-3 font-semibold py-3 disabled:opacity-60"
          style={{
            background: "transparent",
            border: "1px solid var(--surface-border)",
            color: "var(--text)",
            borderRadius: "var(--radius-tile)",
            minHeight: 48,
          }}
        >
          Try the demo
        </button>
      ) : null}
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
