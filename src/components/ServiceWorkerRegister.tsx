"use client";

import { useEffect } from "react";
import { enablePush } from "@/lib/notifications/subscribe";
import { reconcileSubscription } from "@/lib/notifications/actions";
import { shouldReconcilePush } from "@/lib/notifications/reconcile";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});

    // A subscription is per device while notif_master is per user, so the two
    // drift: a pruned endpoint, a reinstall, or simply a second device leaves
    // the switch reading on while nothing can be delivered here. That failure
    // is silent, so the repair is silent too.
    void (async () => {
      const permission =
        typeof Notification === "undefined" ? null : Notification.permission;
      // Checked before anything touches the network, so a user who never
      // enabled notifications does no work at all.
      if (!shouldReconcilePush(permission)) return;
      try {
        const sub = await enablePush();
        if (sub) await reconcileSubscription(sub);
      } catch {
        // Best effort. A failed repair must never affect the page.
      }
    })();
  }, []);
  return null;
}
