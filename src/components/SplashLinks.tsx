import { splashLinks } from "@/lib/brand/devices";

export function SplashLinks() {
  return (
    <>
      {splashLinks().map((l) => (
        <link key={l.href} rel={l.rel} href={l.href} media={l.media} />
      ))}
    </>
  );
}
