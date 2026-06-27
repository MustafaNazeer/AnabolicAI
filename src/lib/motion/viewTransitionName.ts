/**
 * Build a stable, collision-free CSS view-transition-name from a static prefix
 * and a per-item id.
 *
 * Characters that are not valid in a CSS custom-ident are escaped losslessly as
 * `_<codepoint-hex>_`, and the underscore escape marker is itself escaped, so
 * two distinct ids can never collapse to the same name the way a plain strip of
 * disallowed characters could. Ids made only of [A-Za-z0-9-] (such as UUIDs)
 * pass through unchanged and stay readable.
 */
export function viewTransitionName(prefix: string, id: string): string {
  const safeId = id.replace(
    /[^A-Za-z0-9-]/g,
    (ch) => `_${ch.codePointAt(0)!.toString(16)}_`,
  );
  return `${prefix}-${safeId}`;
}
