"use client";

import { useState } from "react";
import { approveAccount, revokeAccount } from "@/lib/accounts/actions";
import { sortAccounts } from "@/lib/accounts/sort";
import type { Account } from "@/lib/accounts/admin";

// What a thrown action is reported as. A rejection carries a message written
// for a developer, and a stack trace or a connection string is not something to
// paint on a screen, so the row says this instead.
const FAILED = "Could not reach the server. Try again in a moment.";

const tile = {
  background: "var(--surface)",
  border: "1px solid var(--surface-border)",
  borderRadius: "var(--radius-tile)",
} as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// One row per account, each with the single button that applies to its
// current state: approve a pending account, or revoke an approved one. A
// second control (the notification toggle from a later task) can sit beside
// this list without reworking it, so the list and its error banner stay in
// their own block rather than owning the page layout.
export function AccountList({ accounts }: { accounts: Account[] }) {
  const [items, setItems] = useState(() => sortAccounts(accounts));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Take fresh server data when it arrives. The lazy initialiser above runs
  // once, so without this the list is frozen at mount: both actions call
  // revalidatePath("/settings/accounts"), and every set of props that produced
  // was discarded. This is the screen an admin sits on waiting for a signup to
  // land, so a row appearing only after a remount is the wrong behaviour on the
  // one page where it is most likely to be noticed.
  //
  // Adjusted during render rather than in an effect, which is React's own
  // pattern for resetting state when a prop changes: it re-renders before
  // anything is painted instead of flashing the stale list first. The server is
  // authoritative, so discarding the local optimistic copy is the point, not a
  // side effect. Compared by identity, which is what a new server payload
  // produces; a re-render with the same array leaves the local state alone and
  // keeps the tap-to-move behaviour below.
  const [rendered, setRendered] = useState(accounts);
  if (rendered !== accounts) {
    setRendered(accounts);
    setItems(sortAccounts(accounts));
  }

  // A server action can reject as well as resolve with an error: the network
  // drops, or createAdminClient throws because SUPABASE_SERVICE_ROLE_KEY is
  // unset. Without the catch that rejection escapes an un-awaited handler as
  // an unhandled rejection, and without the finally the row stays dimmed and
  // disabled for good with nothing said. The reset belongs in the finally so
  // it runs on both endings.
  async function toggle(account: Account) {
    setError(null);
    setPendingId(account.id);
    const action = account.approved ? revokeAccount : approveAccount;
    try {
      const result = await action(account.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setItems((current) =>
        sortAccounts(
          current.map((a) =>
            a.id === account.id ? { ...a, approved: !a.approved } : a,
          ),
        ),
      );
    } catch (err) {
      // Logged, not just shown. FAILED is deliberately vague on screen, so
      // without this the only record of a rejection is a message that names
      // nothing. Matches markApproved, claimSignupSeen and notifyAdminsOfSignup,
      // every one of which logs what it swallowed.
      console.error("account action threw", { accountId: account.id, err });
      setError(FAILED);
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="mt-8 text-sm" style={{ color: "var(--text-dim)" }}>
        No accounts have signed up yet.
      </p>
    );
  }

  return (
    <div className="mt-8">
      {/*
        Mounted whether or not it has anything to say. A live region is
        announced reliably only when assistive technology was already watching
        it as the content arrived, and rendering the node and its text together
        is the case screen readers handle inconsistently. Empty, it is a
        paragraph with no line boxes and therefore no height, so the margin
        below carries the spacing only when there is an error to separate.

        Coloured as a failure rather than as a caption. Four other error strings
        in this app use var(--danger); this one used var(--text-dim), which
        renders a failed approve in the same grey as the "Signed up" line under
        every row.
      */}
      <p
        role="alert"
        className="text-sm"
        style={{ color: "var(--danger, #b91c1c)" }}
      >
        {error}
      </p>
      <ul className={`flex flex-col gap-2${error ? " mt-3" : ""}`}>
        {items.map((account) => (
          <li
            key={account.id}
            className="flex items-center justify-between gap-3 px-4 py-3"
            // Announced as well as dimmed. Opacity and a disabled button are
            // both invisible to a screen reader, so between the tap and the
            // result there was no way to tell a request in flight from one that
            // had not started.
            aria-busy={pendingId === account.id}
            style={{ ...tile, opacity: pendingId === account.id ? 0.5 : 1 }}
          >
            <span className="flex flex-col">
              <span className="font-medium" style={{ color: "var(--text)" }}>
                {account.email}
              </span>
              <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                Signed up {formatDate(account.createdAt)}
                {" · "}
                {account.approved ? "Approved" : "Waiting for approval"}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void toggle(account)}
              disabled={pendingId === account.id}
              className="shrink-0 px-4 text-sm font-medium"
              style={{
                minHeight: 44,
                minWidth: 44,
                border: "1px solid var(--surface-border)",
                borderRadius: "var(--radius-tile)",
                color: account.approved ? "var(--text)" : "var(--accent)",
              }}
            >
              {account.approved ? "Revoke" : "Approve"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
