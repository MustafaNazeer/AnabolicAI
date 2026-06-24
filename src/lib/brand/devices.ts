// Current-iPhone portrait splash matrix (logical CSS size + device pixel ratio).
export type SplashDevice = { name: string; cssWidth: number; cssHeight: number; ratio: 2 | 3 };

export const IPHONE_SPLASH: SplashDevice[] = [
  { name: "SE / 8 / 7 / 6s", cssWidth: 375, cssHeight: 667, ratio: 2 },
  { name: "8 Plus", cssWidth: 414, cssHeight: 736, ratio: 3 },
  { name: "XR / 11", cssWidth: 414, cssHeight: 896, ratio: 2 },
  { name: "X / XS / 11 Pro / 12 mini / 13 mini", cssWidth: 375, cssHeight: 812, ratio: 3 },
  { name: "XS Max / 11 Pro Max", cssWidth: 414, cssHeight: 896, ratio: 3 },
  { name: "12 / 12 Pro / 13 / 13 Pro / 14", cssWidth: 390, cssHeight: 844, ratio: 3 },
  { name: "14 Plus / 12-13 Pro Max", cssWidth: 428, cssHeight: 926, ratio: 3 },
  { name: "14 Pro / 15 / 15 Pro / 16", cssWidth: 393, cssHeight: 852, ratio: 3 },
  { name: "16 Pro", cssWidth: 402, cssHeight: 874, ratio: 3 },
  { name: "14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus", cssWidth: 430, cssHeight: 932, ratio: 3 },
  { name: "16 Pro Max", cssWidth: 440, cssHeight: 956, ratio: 3 },
];

export function splashFile(d: SplashDevice): string {
  return `splash-${d.cssWidth * d.ratio}x${d.cssHeight * d.ratio}.png`;
}

export type SplashLink = { rel: "apple-touch-startup-image"; href: string; media: string };

export function splashLinks(): SplashLink[] {
  return IPHONE_SPLASH.map((d) => ({
    rel: "apple-touch-startup-image" as const,
    href: `/splash/${splashFile(d)}`,
    media:
      `screen and (device-width: ${d.cssWidth}px) and (device-height: ${d.cssHeight}px) ` +
      `and (-webkit-device-pixel-ratio: ${d.ratio}) and (orientation: portrait)`,
  }));
}
