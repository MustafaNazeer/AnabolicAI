// The one ordering the accounts screen uses, held in one place because it had
// been written twice, byte identical, in listAccounts and in AccountList. Both
// callers are genuinely needed: the server sorts so the first paint is already
// right, and the client re-sorts so a row moves the moment it is tapped rather
// than after a round trip. The comparator behind them is not needed twice, and
// two copies with nothing keeping them in sync can drift silently into a list
// that reorders itself under the user as soon as the server data arrives.
//
// Deliberately not in admin.ts, which imports "server-only": AccountList is a
// client component, and a value import from there would pull server code toward
// the client bundle.
//
// Generic over the shape rather than tied to the Account type, so the type can
// go on living in admin.ts beside the query that produces it.
export function sortAccounts<
  T extends { approved: boolean; createdAt: string },
>(accounts: T[]): T[] {
  // Copied before sorting. The client holds the server's array in state and
  // re-sorts on every change, so sorting in place would reorder React's own
  // data underneath it.
  return [...accounts].sort((a, b) =>
    // Unapproved first, because those are the only rows that need a tap, then
    // newest first within each group.
    a.approved === b.approved
      ? b.createdAt.localeCompare(a.createdAt)
      : Number(a.approved) - Number(b.approved),
  );
}
