import { markSvg, MARK_VIEWBOX } from "@/lib/brand/mark";

const [, , VBW, VBH] = MARK_VIEWBOX.split(" ").map(Number);
const ASPECT = VBH / VBW; // 140/120

export function BrandMark({
  size = 64,
  variant = "lit",
  title = "Onyx",
  className,
}: {
  size?: number;
  variant?: "lit" | "mono";
  title?: string;
  className?: string;
}) {
  const width = size;
  const height = Math.round(size * ASPECT);
  // markSvg() returns "<svg ...>inner</svg>"; pull the inner markup out for JSX embedding.
  const inner = markSvg({ variant }).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  return (
    <svg
      role="img"
      aria-label={title}
      width={width}
      height={height}
      viewBox={MARK_VIEWBOX}
      fill="none"
      className={className}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
