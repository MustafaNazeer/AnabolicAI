// src/components/ThemePicker.tsx
"use client";

import { useTheme } from "@/components/ThemeProvider";
import { THEMES, type Theme } from "@/lib/theme";

const SWATCH: Record<Theme, { label: string; accent: string; base: string }> = {
  cobalt: { label: "Cobalt", accent: "#3b82f6", base: "#111a2c" },
  emerald: { label: "Emerald", accent: "#34d399", base: "#18271f" },
  magenta: { label: "Magenta", accent: "#f0457e", base: "#2a1320" },
  crimson: { label: "Crimson", accent: "#ef4444", base: "#251114" },
  rose: { label: "Rose", accent: "#fb7185", base: "#241318" },
};

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="grid grid-cols-5 gap-2.5">
      {THEMES.map((t) => {
        const s = SWATCH[t];
        const active = t === theme;
        return (
          <button
            key={t}
            type="button"
            aria-label={s.label}
            aria-pressed={active}
            onClick={() => setTheme(t)}
            className="flex flex-col items-center gap-1.5 p-2"
            style={{
              minHeight: 44,
              borderRadius: "var(--radius-tile)",
              border: `2px solid ${active ? s.accent : "transparent"}`,
              background: "var(--surface)",
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: "var(--radius-square)",
                background: s.base,
                border: `2px solid ${s.accent}`,
              }}
            />
            <span className="text-[9px]" style={{ color: "var(--text-dim)" }}>
              {s.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
