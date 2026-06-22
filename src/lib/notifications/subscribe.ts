"use client";

import { urlBase64ToUint8Array } from "@/lib/notifications/vapid";

export type RawSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function enablePush(): Promise<RawSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    }));

  const json = sub.toJSON();
  if (!json.keys) return null;
  return { endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
}

export async function disablePush(): Promise<string | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
