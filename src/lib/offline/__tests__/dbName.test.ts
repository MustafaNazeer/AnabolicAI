import { describe, it, expect } from "vitest";
import { DB_NAME } from "@/lib/offline/idb";

describe("IndexedDB database name", () => {
  it("is still onyx, deliberately, and must not be renamed", () => {
    // The app was renamed to AnabolicAI on 2026-08-15. This name was NOT
    // changed with it. Renaming it orphans every device's pending offline
    // outbox: sets logged without a connection become unreachable and never
    // sync. See docs/rename.md. If you are here because this test failed,
    // revert the rename rather than updating this expectation.
    expect(DB_NAME).toBe("onyx");
  });
});
