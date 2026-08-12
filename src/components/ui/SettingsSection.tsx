"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { runViewTransition } from "@/lib/motion/viewTransition";
import { viewTransitionName } from "@/lib/motion/viewTransitionName";

// A settings group that opens on a tap. Every group starts closed, so the
// screen reads as a short list rather than a wall of controls.
//
// The toggle routes through runViewTransition rather than calling setState
// directly. The onyx-lift class alone is inert without it: the rest duration
// picker shipped exactly that way on 2026-08-04, with the class on the markup
// and nothing invoking startViewTransition, and the panel snapped open.
export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <section className="mb-3">
      <button
        type="button"
        onClick={() => runViewTransition(() => setOpen((v) => !v))}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--surface-border)",
          borderRadius: "var(--radius-tile)",
          color: "var(--text)",
          minHeight: 44,
        }}
      >
        <span className="text-lg font-semibold">{title}</span>
        <ChevronDown
          size={20}
          aria-hidden="true"
          style={{
            color: "var(--text-dim)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 200ms ease",
          }}
        />
      </button>

      {open ? (
        <div
          id={panelId}
          className="onyx-lift mt-3"
          // Named per section so two panels animating at once cannot collide.
          style={{ viewTransitionName: viewTransitionName("settings", title) }}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
