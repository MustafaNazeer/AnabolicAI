import { flushSync } from "react-dom";
import { prefersReducedMotion } from "./reducedMotion";

type DocWithVT = Document & {
  startViewTransition?: (callback: () => void) => unknown;
};

/**
 * Run a synchronous DOM update inside a View Transition when supported and
 * the user allows motion; otherwise run it directly. flushSync forces React
 * to commit the update synchronously so the transition captures the new state.
 */
export function runViewTransition(update: () => void): void {
  const doc =
    typeof document !== "undefined" ? (document as DocWithVT) : undefined;

  if (!doc || typeof doc.startViewTransition !== "function" || prefersReducedMotion()) {
    update();
    return;
  }

  doc.startViewTransition(() => {
    flushSync(() => {
      update();
    });
  });
}
