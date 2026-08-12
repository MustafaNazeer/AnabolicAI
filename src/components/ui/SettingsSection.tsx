"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// A settings group that opens on a tap. Every group starts closed, so the
// screen reads as a short list rather than a wall of controls.
//
// The panel animates its OWN height and nothing else. This shipped first as a
// view transition, which was wrong: a view transition snapshots the whole
// document, so collapsing a group produced two complete page images offset by
// the collapsed height, cross-fading through each other. Photographed
// mid-collapse on 2026-08-12, with the Export header painted straight through
// the notification rows. The exercise picker gets away with the same approach
// only because almost nothing sits below it.
//
// The contents stay mounted, because an element that is not there has no
// height to animate to. `inert` is what keeps a closed group out of the tab
// order and out of the accessibility tree.
export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const innerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // The height is measured rather than expressed in CSS because the two CSS
  // only techniques were both measured to be wrong (see globals.css). An
  // observer rather than a one-off measurement, because this content changes
  // size while open: turning the notifications master switch off collapses
  // every row beneath it, and a stale height would clip them.
  useEffect(() => {
    const el = innerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // offsetHeight rather than the entry's contentRect, which reports the
    // content box and excludes this element's own top padding. Measured on
    // 2026-08-12: contentRect gave 650 against a real 662, so every open group
    // clipped its last 12 pixels.
    const observer = new ResizeObserver(() => {
      setContentHeight(el.offsetHeight);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
            transition: "transform 220ms ease",
          }}
        />
      </button>

      <div
        id={panelId}
        className="onyx-collapsible"
        data-open={open ? "true" : "false"}
        inert={!open}
        style={{ height: open ? contentHeight : 0 }}
      >
        <div ref={innerRef} className="pt-3">
          {children}
        </div>
      </div>
    </section>
  );
}
