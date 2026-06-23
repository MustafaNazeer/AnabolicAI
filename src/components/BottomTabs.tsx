// src/components/BottomTabs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, Plus, TrendingUp, Settings } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", Icon: Home, cta: false },
  { href: "/routines", label: "Routines", Icon: Dumbbell, cta: false },
  { href: "/log", label: "Log", Icon: Plus, cta: true },
  { href: "/progress", label: "Progress", Icon: TrendingUp, cta: false },
  { href: "/settings", label: "Settings", Icon: Settings, cta: false },
] as const;

export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed flex items-center justify-around border"
      style={{
        left: 14,
        right: 14,
        bottom: "calc(14px + env(safe-area-inset-bottom))",
        height: 60,
        borderRadius: 22,
        background: "var(--surface)",
        borderColor: "var(--surface-border)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      {TABS.map(({ href, label, Icon, cta }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        if (cta) {
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              data-cta="true"
              className="flex items-center justify-center"
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                background: "var(--accent)",
                color: "var(--on-accent)",
                boxShadow: "0 6px 16px var(--accent-dim)",
              }}
            >
              <Icon size={22} aria-hidden />
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            data-cta="false"
            className="flex flex-1 flex-col items-center justify-center gap-1"
            style={{ minHeight: 44, color: active ? "var(--text)" : "var(--text-dim)" }}
          >
            <Icon size={22} aria-hidden />
          </Link>
        );
      })}
    </nav>
  );
}
