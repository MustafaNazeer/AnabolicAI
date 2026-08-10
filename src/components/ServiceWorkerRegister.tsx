"use client";

import { useEffect } from "react";
import { enablePush } from "@/lib/notifications/subscribe";
import { reconcileSubscription } from "@/lib/notifications/actions";
import { shouldReconcilePush } from "@/lib/notifications/reconcile";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Production only. The worker serves /_next/static/ cache first and never
    // revalidates it, on the premise that a build's filenames are content
    // hashed so a given URL's bytes can never change. Dev breaks that premise:
    // it serves unhashed chunks under the same prefix, which would be cached
    // once and then pinned until this file's own bytes change. The push
    // repair below is inside the guard too, because it waits on a registration
    // that would never arrive here.
    if (process.env.NODE_ENV !== "production") return;
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
