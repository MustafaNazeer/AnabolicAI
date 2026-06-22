"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, Plus, TrendingUp, Settings } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/routines", label: "Routines", Icon: Dumbbell },
  { href: "/log", label: "Log", Icon: Plus },
  { href: "/progress", label: "Progress", Icon: TrendingUp },
  { href: "/settings", label: "Settings", Icon: Settings },
] as const;

export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex border-t"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2"
            style={{ minHeight: 56, color: active ? "var(--accent)" : "var(--text-dim)" }}
          >
            <Icon size={22} aria-hidden />
            <span className="text-[11px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
