/**
 * Whether to attempt a silent push subscription repair on app load.
 *
 * Only "granted" qualifies. enablePush() calls
 * Notification.requestPermission() internally, which PROMPTS when permission
 * is "default", so attempting a repair in any other state would raise a
 * permission dialog on every launch. That is why this is a named, tested
 * function rather than an inline condition.
 */
export function shouldReconcilePush(permission: string | null): boolean {
  return permission === "granted";
}
