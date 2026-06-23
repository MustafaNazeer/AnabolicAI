"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="px-5 pt-16 pb-24 max-w-sm mx-auto">
      <h1
        className="text-[26px] font-semibold mb-2"
        style={{ fontFamily: "var(--font-spectral)", color: "var(--text)" }}
      >
        Something went wrong
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
        That didn&apos;t save. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="font-semibold py-3 px-5"
        style={{
          background: "var(--accent)",
          color: "var(--on-accent)",
          borderRadius: "var(--radius-tile)",
          minHeight: 48,
        }}
      >
        Try again
      </button>
    </main>
  );
}
