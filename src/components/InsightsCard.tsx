"use client";

import { useState } from "react";
import Link from "next/link";
import { setAiInsights, suggestInsights } from "@/lib/ai/insights/actions";
import { useOnline } from "@/lib/offline/useOnline";
import { Skeleton } from "@/components/ui/Skeleton";

const CONSENT_SAVE_FAILED = "Could not turn that on. Try again in a moment.";
// Mirrors the action's own UNAVAILABLE copy. Not imported: a "use server"
// module may only export async functions, so the string is kept here too.
const INSIGHTS_UNAVAILABLE = "Insights are unavailable right now.";

const fieldStyle = {
  background: "var(--surface-sunken)",
  border: "1px solid var(--surface-border)",
  borderRadius: "var(--radius-square)",
  color: "var(--text)",
  minHeight: 44,
} as const;

export function InsightsCard({ initialEnabled }: { initialEnabled: boolean }) {
  const online = useOnline();
  const [aiEnabled, setAiEnabledLocal] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);
  const [insights, setInsights] = useState<string[] | null>(null);
  const [anyStalled, setAnyStalled] = useState(false);

  async function fetchInsights() {
    setBusy(true);
    setError(null);
    // A rejection (a dropped connection mid request, common on a gym's
    // signal) must read the same as the action's own unavailable outcome,
    // not leave the card busy forever. The finally owns clearing busy on
    // every path out: success, a returned error, or a throw.
    try {
      const result = await suggestInsights();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInsights(result.insights);
      setAnyStalled(result.anyStalled);
    } catch {
      setError(INSIGHTS_UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  }

  async function ask() {
    // The notice always comes first while consent is off, so nothing is sent
    // before the user has seen what leaves the device.
    if (!aiEnabled) {
      setNotice(true);
      return;
    }
    await fetchInsights();
  }

  async function enable() {
    // Set before the await, not inside fetchInsights, so the Enable button
    // is guarded for the whole round trip: the consent write and the fetch
    // that follows it. fetchInsights clears busy at the end in its finally.
    setBusy(true);
    let result: Awaited<ReturnType<typeof setAiInsights>>;
    try {
      result = await setAiInsights(true);
    } catch {
      // A rejection reads the same as a returned error: neither leaves the
      // button disabled forever, and the notice stays open so Enable
      // re-renders usable in place for an immediate retry.
      setBusy(false);
      setError(CONSENT_SAVE_FAILED);
      return;
    }
    if ("error" in result) {
      setBusy(false);
      setError(CONSENT_SAVE_FAILED);
      return;
    }
    setAiEnabledLocal(true);
    setNotice(false);
    await fetchInsights();
  }

  return (
    <section className="mt-[18px]">
      <h2
        className="text-[10.5px] uppercase tracking-[.11em] mb-2.5"
        style={{ color: "var(--text-dim)" }}
      >
        Insights
      </h2>
      <div
        className="p-4"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--surface-border)",
          borderRadius: "var(--radius-tile)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        {/* Stays mounted once an answer arrives. Rendering it behind
            insights === null meant the button vanished for good and the only
            way to ask again was to navigate away and back. The action's rate
            limit already bounds how often asking can cost anything. */}
        <button
          type="button"
          onClick={() => void ask()}
          disabled={busy || !online}
          className="px-3 py-2 text-sm font-medium disabled:opacity-60"
          style={fieldStyle}
        >
          {insights === null ? "What stands out this week?" : "Ask again"}
        </button>

        {busy ? (
          <Skeleton className="w-full mt-3" style={{ height: 20 }} />
        ) : null}

        <div role="alert">
          {error ? (
            <p
              className="text-xs mt-2"
              style={{ color: "var(--danger, #b91c1c)" }}
            >
              {error}
            </p>
          ) : null}
        </div>

        {notice ? (
          <div
            className="mt-3 p-3 text-sm"
            style={{
              background: "var(--surface-sunken)",
              border: "1px solid var(--surface-border)",
              borderRadius: "var(--radius-square)",
            }}
          >
            <p style={{ color: "var(--text)" }}>
              This sends up to your five most recently trained lifts (name,
              muscle group, the app&apos;s own trend and stall verdict for
              each, and their last four sessions: how many days ago, reps,
              weight, and reps in reserve), plus your weekly workout and set
              counts and streak, to Anthropic&apos;s API to write short
              observations, only when you ask. Nothing else is sent, and
              nothing is stored. Turn it off any time in Settings.
            </p>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => void enable()}
                disabled={busy}
                className="px-3 py-2 text-sm font-medium disabled:opacity-60"
                style={fieldStyle}
              >
                Enable
              </button>
              <button
                type="button"
                onClick={() => setNotice(false)}
                className="px-3 py-2 text-sm"
                style={{ ...fieldStyle, color: "var(--text-dim)" }}
              >
                Not now
              </button>
            </div>
          </div>
        ) : null}

        {/* The region exists before there is anything to say, because a live
            region that appears already populated is often not announced. */}
        <div role="status" className={insights !== null ? "mt-1" : undefined}>
          {insights !== null ? (
            <>
              <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                AI insights
              </p>
              <ul className="flex flex-col gap-1 mt-1">
                {insights.map((text, i) => (
                  // Position is the identity here: the model can return two
                  // identical sentences, and a text key would collide.
                  <li key={i} style={{ color: "var(--text)" }}>
                    {text}
                  </li>
                ))}
              </ul>
              {anyStalled ? (
                <p className="text-xs mt-2">
                  <Link
                    href="/progress"
                    className="underline inline-block py-3.5"
                    style={{ color: "var(--text-dim)" }}
                  >
                    One of your lifts has stopped progressing. Progress has a
                    suggestion.
                  </Link>
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
