// scripts/generate-brand-assets.mjs
import { mkdir, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

import { markSvg } from "../src/lib/brand/mark.ts";
import { IPHONE_SPLASH, splashFile } from "../src/lib/brand/devices.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = (...x) => path.join(ROOT, ...x);

const BASE_TOP = "#111a2c";
const BASE_BOT = "#070a10";
const VBW = 120, VBH = 140;

// Compose an opaque square: cobalt radial base + optional rounded-square tile + centered stone.
function iconSvg(px, { tile = true, stoneScale = 0.62 } = {}) {
  const stoneH = px * stoneScale;
  const stoneW = stoneH * (VBW / VBH);
  const sx = (px - stoneW) / 2;
  const sy = (px - stoneH) / 2;
  const r = Math.round(px * 0.22); // rounded-square radius
  const stone = markSvg({ variant: "lit" })
    .replace(/^<svg[^>]*>/, `<svg x="${sx}" y="${sy}" width="${stoneW}" height="${stoneH}" viewBox="0 0 ${VBW} ${VBH}" xmlns="http://www.w3.org/2000/svg" fill="none">`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
    <defs><radialGradient id="bg" cx="0.5" cy="0" r="1.1">
      <stop offset="0" stop-color="${BASE_TOP}"/><stop offset="0.62" stop-color="${BASE_BOT}"/></radialGradient></defs>
    ${tile
      ? `<rect width="${px}" height="${px}" rx="${r}" ry="${r}" fill="url(#bg)"/>`
      : `<rect width="${px}" height="${px}" fill="url(#bg)"/>`}
    ${stone}
  </svg>`;
}

// Splash: full-bleed cobalt base, stone centered, modest size.
function splashSvg(w, h) {
  const stoneH = Math.min(w, h) * 0.22;
  const stoneW = stoneH * (VBW / VBH);
  const sx = (w - stoneW) / 2;
  const sy = (h - stoneH) / 2;
  const stone = markSvg({ variant: "lit" })
    .replace(/^<svg[^>]*>/, `<svg x="${sx}" y="${sy}" width="${stoneW}" height="${stoneH}" viewBox="0 0 ${VBW} ${VBH}" xmlns="http://www.w3.org/2000/svg" fill="none">`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><radialGradient id="bg" cx="0.5" cy="0" r="1.0">
      <stop offset="0" stop-color="${BASE_TOP}"/><stop offset="0.62" stop-color="${BASE_BOT}"/></radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    ${stone}
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
  await png(iconSvg(512, { tile: false, stoneScale: 0.5 }), p("public/icons/icon-maskable-512.png"), 512, 512);
  await png(iconSvg(180), p("src/app/apple-icon.png"), 180, 180);

  // Browser icon: ship the lit stone on a tile as a crisp SVG favicon.
  await writeFile(p("src/app/icon.svg"), iconSvg(64), "utf8");

  // favicon.ico from 32 + 16 PNGs via ImageMagick.
  await png(iconSvg(32), p("public/_fav32.png"), 32, 32);
  await png(iconSvg(16), p("public/_fav16.png"), 16, 16);
  execFileSync("convert", [p("public/_fav32.png"), p("public/_fav16.png"), p("src/app/favicon.ico")]);
  await rm(p("public/_fav32.png")); await rm(p("public/_fav16.png"));

  // Splash set.
  for (const d of IPHONE_SPLASH) {
    const w = d.cssWidth * d.ratio, h = d.cssHeight * d.ratio;
    await png(splashSvg(w, h), p("public/splash", splashFile(d)), w, h);
  }
  console.log("brand assets generated");
}
main().catch((e) => { console.error(e); process.exit(1); });
