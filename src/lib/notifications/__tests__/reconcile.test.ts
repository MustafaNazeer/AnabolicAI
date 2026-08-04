import { describe, it, expect } from "vitest";
import { shouldReconcilePush } from "@/lib/notifications/reconcile";

describe("shouldReconcilePush", () => {
  it("repairs only when permission was already granted", () => {
    expect(shouldReconcilePush("granted")).toBe(true);
  });

  // THE RULE THAT MATTERS. enablePush calls Notification.requestPermission
  // internally, which PROMPTS when permission is "default". Attempting a
  // repair in that state would pop a permission dialog on every app load.
  it("never attempts a repair that could raise a prompt", () => {
    expect(shouldReconcilePush("default")).toBe(false);
  });

  it("does not fight a denied permission", () => {
    expect(shouldReconcilePush("denied")).toBe(false);
  });

  it("does nothing where notifications are unsupported", () => {
    expect(shouldReconcilePush(null)).toBe(false);
  });
});
