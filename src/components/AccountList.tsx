"use client";

import { useState } from "react";
import { approveAccount, revokeAccount } from "@/lib/accounts/actions";
import type { Account } from "@/lib/accounts/admin";

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

// Unapproved first, because those are the only rows that need a tap, then
// newest first within each group. Sorted here too, not just by listAccounts,
// so the row a caller just acted on moves to the right place immediately
// instead of waiting on a full page reload.
function sortAccounts(accounts: Account[]): Account[] {
  return [...accounts].sort((a, b) =>
    a.approved === b.approved
      ? b.createdAt.localeCompare(a.createdAt)
      : Number(a.approved) - Number(b.approved),
  );
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

  async function toggle(account: Account) {
    setError(null);
    setPendingId(account.id);
    const action = account.approved ? revokeAccount : approveAccount;
    const result = await action(account.id);
    setPendingId(null);
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
  }

  if (items.length === 0) {
    return (
      <p className="mt-8 text-sm" style={{ color: "var(--text-dim)" }}>
        No accounts have signed up yet.
      </p>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-3">
      {error ? (
        <p role="alert" className="text-sm" style={{ color: "var(--text-dim)" }}>
          {error}
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {items.map((account) => (
          <li
            key={account.id}
            className="flex items-center justify-between gap-3 px-4 py-3"
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
