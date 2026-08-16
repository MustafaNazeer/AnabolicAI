// The browser chrome colours: the status bar tint on iOS and the ground the
// PWA paints behind the app before it has drawn anything.
//
// These used to live in three places at once, the web manifest, the root
// layout's viewport export and AppearanceProvider, with nothing tying any of
// them to the stylesheet. That is exactly how all three were left holding
// cobalt's bases when crimson became the default accent: the status bar
// disagreed with the app behind it and no test could see the difference.
//
// One definition now. The values are the two ends of the default theme's own
// dark and light background gradients in src/app/globals.css, and
// chrome.test.ts reads that stylesheet to prove they still match, so changing
// DEFAULT_THEME without changing these fails the suite instead of shipping.
export const CHROME_COLOR = {
  light: "#fceceb",
  dark: "#0a0708",
} as const;
