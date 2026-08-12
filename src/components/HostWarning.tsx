"use client";

import { useSyncExternalStore } from "react";
import { checkHost } from "@/lib/deployment";

// The host never changes for the life of a document, so there is nothing to
// subscribe to. The server has no window and returns an empty host, which
// checkHost already treats as "unknown, say nothing", so the server and the
// first client render agree and there is no hydration mismatch.
const subscribe = () => () => {};
const clientHost = () => window.location.host;
const serverHost = () => "";

// Shown when the browser is talking to a build that is not the live app.
//
// Adding a preview URL to the iPhone home screen pins that install to that
// build permanently, and nothing on screen ever says so. On 2026-08-12 that
// cost an evening: the app looked normal, signed in against a deactivated
// Supabase key, and the only way to find it was comparing against Safari.
//
// Only the browser knows which host it is actually talking to, so that half
// is read through useSyncExternalStore rather than during render.
export function HostWarning({
  canonicalHost,
  vercelEnv,
}: {
  canonicalHost: string | undefined;
  vercelEnv: string | undefined;
}) {
  const host = useSyncExternalStore(subscribe, clientHost, serverHost);
  const verdict = checkHost(host, { canonicalHost, vercelEnv });

  if (!verdict.offCanonical) return null;

  return (
    <div
      role="status"
      className="text-sm px-4 py-3 m-4"
      style={{
        background: "var(--surface-sunken)",
        border: "1px solid var(--surface-border)",
        borderRadius: "var(--radius-tile)",
        color: "var(--text-dim)",
      }}
    >
      {/* The environment is a label in brackets rather than a clause, because
          "this is not the live app, which is a production build" reads as a
          contradiction, and a stale production deployment URL is one of the
          two ways to end up here. Found by looking at it in a browser; the
          unit tests assert the words are present and cannot see this. */}
      <p>
        This is not the live app. You are on {verdict.actual} ({verdict.environment}).
      </p>
      <p className="mt-2">Open {verdict.canonical} instead, and reinstall from there.</p>
    </div>
  );
}
