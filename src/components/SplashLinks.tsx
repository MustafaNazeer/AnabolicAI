import { splashLinks } from "@/lib/brand/devices";
import { DEFAULT_THEME } from "@/lib/theme";

// Rendered from the root layout, on the server, where the accent is unknowable:
// it lives in localStorage under "onyx-theme" and is applied after hydration.
// The layout renders data-theme="crimson" for the same reason, so the markup
// ships the default accent here too and ThemeProvider corrects both together.
export function SplashLinks() {
  return (
    <>
      {splashLinks(DEFAULT_THEME).map((l) => (
        <link key={l.href} rel={l.rel} href={l.href} media={l.media} />
      ))}
    </>
  );
}
