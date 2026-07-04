"use client";

import { useEffect, useState } from "react";

export function useOnline(): boolean {
  // Start optimistic so the server and first client render agree (no hydration
  // mismatch); the effect corrects it on mount.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}
