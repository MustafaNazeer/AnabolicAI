// scripts/generate-brand-assets.mjs
import { mkdir, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

import { markSvg, MARK_VIEWBOX } from "../src/lib/brand/mark.ts";
import { IPHONE_SPLASH, splashFile } from "../src/lib/brand/devices.ts";
import { THEME_ASSETS, appleIconFile, SPLASH_THEMES } from "../src/lib/brand/themeAssets.ts";
import { THEMES, DEFAULT_THEME } from "../src/lib/theme.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = (...x) => path.join(ROOT, ...x);

// A generated PNG cannot follow the user's accent, so every asset bakes one.
// The values come from THEME_ASSETS, which themeAssets.test.ts proves still
// match globals.css, so a colour changed in the stylesheet cannot leave a
// stale icon shipping behind it. Everything except the per-accent apple icons
// bakes DEFAULT_THEME.
const [, , VBW, VBH] = MARK_VIEWBOX.split(" ").map(Number);

// Compose an opaque square: the theme's radial base + optional rounded-square tile + centered mark.
function iconSvg(px, { tile = true, markScale = 0.62, theme = DEFAULT_THEME } = {}) {
  const { accent: ACCENT, baseTop: BASE_TOP, baseBot: BASE_BOT } = THEME_ASSETS[theme];
  const markH = px * markScale;
  const markW = markH * (VBW / VBH);
  const sx = (px - markW) / 2;
  const sy = (px - markH) / 2;
  const r = Math.round(px * 0.22); // rounded-square radius
  const mark = markSvg({ variant: "lit", color: ACCENT })
    .replace(/^<svg[^>]*>/, `<svg x="${sx}" y="${sy}" width="${markW}" height="${markH}" viewBox="0 0 ${VBW} ${VBH}" xmlns="http://www.w3.org/2000/svg" fill="none">`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
    <defs><radialGradient id="bg" cx="0.5" cy="0" r="1.1">
      <stop offset="0" stop-color="${BASE_TOP}"/><stop offset="0.62" stop-color="${BASE_BOT}"/></radialGradient></defs>
    ${tile
      ? `<rect width="${px}" height="${px}" rx="${r}" ry="${r}" fill="url(#bg)"/>`
      : `<rect width="${px}" height="${px}" fill="url(#bg)"/>`}
    ${mark}
  </svg>`;
}

// Splash: full-bleed base, mark centered, modest size. One set per accent in
// SPLASH_THEMES, because a PNG cannot follow the user's chosen accent.
function splashSvg(w, h, theme = DEFAULT_THEME) {
  const { accent: ACCENT, baseTop: BASE_TOP, baseBot: BASE_BOT } = THEME_ASSETS[theme];
  const markH = Math.min(w, h) * 0.22;
  const markW = markH * (VBW / VBH);
  const sx = (w - markW) / 2;
  const sy = (h - markH) / 2;
  const mark = markSvg({ variant: "lit", color: ACCENT })
    .replace(/^<svg[^>]*>/, `<svg x="${sx}" y="${sy}" width="${markW}" height="${markH}" viewBox="0 0 ${VBW} ${VBH}" xmlns="http://www.w3.org/2000/svg" fill="none">`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><radialGradient id="bg" cx="0.5" cy="0" r="1.0">
      <stop offset="0" stop-color="${BASE_TOP}"/><stop offset="0.62" stop-color="${BASE_BOT}"/></radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    ${mark}
  </svg>`;
}

async function png(svg, outPath, w, h) {
  await sharp(Buffer.from(svg)).resize(w, h).png().toFile(outPath);
  console.log("wrote", path.relative(ROOT, outPath));
}

async function main() {
  await mkdir(p("public/icons"), { recursive: true });
  await mkdir(p("public/splash"), { recursive: true });

  // Manifest icons (opaque, tiled) + apple-icon (180).
  await png(iconSvg(192), p("public/icons/icon-192.png"), 192, 192);
  await png(iconSvg(512), p("public/icons/icon-512.png"), 512, 512);
  await png(iconSvg(512, { tile: false, markScale: 0.5 }), p("public/icons/icon-maskable-512.png"), 512, 512);
  await png(iconSvg(180), p("src/app/apple-icon.png"), 180, 180);

  // One apple icon per accent. iOS snapshots whatever <link rel="apple-touch-icon">
  // points at when the user taps Add to Home Screen, so ThemeProvider swaps the
  // href and the installed tile matches the accent in use at that moment. It
  // cannot change an already installed icon; nothing on the web platform can.
  for (const theme of THEMES) {
    await png(iconSvg(180, { theme }), p("public/icons", appleIconFile(theme)), 180, 180);
  }

  // Browser icon: ship the lit mark on a tile as a crisp SVG favicon.
  await writeFile(p("src/app/icon.svg"), iconSvg(64) + "\n", "utf8");

  // favicon.ico from 32 + 16 PNGs via ImageMagick.
  await png(iconSvg(32), p("public/_fav32.png"), 32, 32);
  await png(iconSvg(16), p("public/_fav16.png"), 16, 16);
  execFileSync("convert", [p("public/_fav32.png"), p("public/_fav16.png"), p("src/app/favicon.ico")]);
  await rm(p("public/_fav32.png")); await rm(p("public/_fav16.png"));

  // Splash set, one per device per accent that has one.
  //
  // The directory is emptied first rather than written over. The names carry
  // the accent, so narrowing SPLASH_THEMES or renaming the scheme leaves files
  // behind that no link points at, and those are not merely dead weight: the
  // proxy matcher stops excluding them, so a stray request for one falls
  // through to the app's 404 with no policy. generated-assets.test.ts fails on
  // any leftover, and this is what stops it happening in the first place.
  await rm(p("public/splash"), { recursive: true, force: true });
  await mkdir(p("public/splash"), { recursive: true });
  for (const theme of SPLASH_THEMES) {
    for (const d of IPHONE_SPLASH) {
      const w = d.cssWidth * d.ratio, h = d.cssHeight * d.ratio;
      await png(splashSvg(w, h, theme), p("public/splash", splashFile(d, theme)), w, h);
    }
  }
  console.log("brand assets generated");
}
main().catch((e) => { console.error(e); process.exit(1); });
