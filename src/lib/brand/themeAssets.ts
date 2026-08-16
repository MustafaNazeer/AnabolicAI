// RELATIVE, NOT "@/lib/theme", AND IT HAS TO STAY THAT WAY.
// scripts/generate-brand-assets.mjs imports this file directly under Node's
// type stripping, which resolves neither the tsconfig "@/" alias nor anything
// that needs a bundler. A TYPE-only import across the alias is fine, because
// Node erases it before resolving; this one pulls a real value, so it must be a
// path Node can follow. Changing it back breaks "npm run gen:brand" only, which
// no test runs, so the breakage would surface the next time someone regenerates
// the assets rather than here.
// The ".ts" is required too: Node's ESM resolver does no extension guessing.
// tsconfig.json already enables allowImportingTsExtensions for the same reason,
// for the .mts lighthouse scripts, and its comment there explains the rest.
import { type Theme, DEFAULT_THEME } from "../theme.ts";

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

// Which accents have a generated launch splash set. THIS IS DELIBERATELY A
// SUBSET OF THEMES, and it is a probe that has NOT yet returned a usable
// answer. Do not widen it without reading the rest of this comment.
//
// A splash set costs 11 PNGs per accent against the icon's 1, and the reason
// the icon was worth paying for does not obviously carry over. iOS is
// documented nowhere on when it captures a startup image: the best source
// available says the device caches them when the user taps Add to Home Screen,
// which would mean a swap after install changes nothing until the app is
// deleted and re-added, exactly like the icon.
//
// SO ONE ALTERNATE ACCENT SHIPPED FIRST, AND THE DEVICE PASS THAT FOLLOWED DID
// NOT ANSWER THE QUESTION. Selecting emerald and relaunching showed a green
// launch screen, which looks like proof that iOS re-reads these links. It is
// not. Selecting COBALT, which has no generated artwork at all, showed a BLUE
// one, and no file on the device can produce that: the app's own background and
// mark follow the accent through live CSS, applied before first paint by
// NO_FLASH_SCRIPT, and for one frame that is very hard to tell from the
// artwork, which is near black with a small centred mark and no text. The
// emerald result was the app painting itself. Whether iOS draws these images at
// all on a current iPhone is STILL UNKNOWN, and a colour is not a discriminator
// for it: use the presence of text, the mark's vertical position, or a screen
// recording scrubbed to the launch frame.
//
// AND FINISHING THIS IS NOT ONE EDIT, THOUGH IT LOOKS LIKE IT. Setting this to
// THEMES also needs the proxy matcher widened in the same commit, and it
// silently hollows out three assertions that iterate THEMES minus this list,
// which becomes empty: the fold in themeAssets.test.ts, the matcher counterpart
// in generated-assets.test.ts, and the fold in ThemeProvider.test.tsx. They go
// on passing while proving nothing. Re-point the two fold tests at a synthetic
// accent and rewrite the counterpart to assert the matcher's enumerated group
// EQUALS the accent set, which has teeth in both directions.
export const SPLASH_THEMES: readonly Theme[] = ["crimson", "emerald"];

// The app offers five accents and ships splashes for two, so every href has to
// be resolved through here. Pointing a startup image at an accent with no file
// is worse than pointing it at the wrong colour: the matcher only excludes the
// accents that exist, so the request is not a missing image but a 307 to
// /sign-in in the middle of a launch.
export const splashThemeFor = (theme: Theme): Theme =>
  SPLASH_THEMES.includes(theme) ? theme : DEFAULT_THEME;
