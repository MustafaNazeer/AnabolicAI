import type { Theme } from "@/lib/theme";

// The colours the asset generator bakes into PNGs, one set per accent.
//
// A generated PNG cannot follow a CSS custom property, so these are copies of
// what globals.css declares. Copies drift, which is exactly how the old mark
// stayed cobalt after crimson became the default, so themeAssets.test.ts parses
// the stylesheet and fails if any value here stops matching it.
//
// accent  = --accent in [data-mode="dark"][data-theme="<t>"]
// baseTop = first stop of that block's --bg-gradient
// baseBot = second stop
export const THEME_ASSETS: Record<Theme, { accent: string; baseTop: string; baseBot: string }> = {
  cobalt: { accent: "#3b82f6", baseTop: "#111a2c", baseBot: "#070a10" },
  magenta: { accent: "#f0457e", baseTop: "#2a1320", baseBot: "#0c060a" },
  emerald: { accent: "#34d399", baseTop: "#18271f", baseBot: "#070c09" },
  crimson: { accent: "#ef4444", baseTop: "#251114", baseBot: "#0a0708" },
  rose: { accent: "#fb7185", baseTop: "#241318", baseBot: "#0b0709" },
};

// iOS reads <link rel="apple-touch-icon"> for the home screen icon, not the
// web manifest, and it snapshots whatever that href points at AT THE MOMENT
// the user taps Add to Home Screen. It never refetches afterwards, so this
// makes the installed icon match the accent in use at install time. It cannot
// make an already installed icon change; nothing on the web platform can.
//
// The name must keep the shape the proxy matcher excludes, or a signed out
// request for it is redirected to /sign-in and the icon silently fails.
export const appleIconFile = (theme: Theme): string => `apple-icon-${theme}.png`;
export const appleIconHref = (theme: Theme): string => `/icons/${appleIconFile(theme)}`;
