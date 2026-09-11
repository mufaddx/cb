"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BRAND_NAV = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/campaigns", label: "Campaigns", icon: "📣" },
  { href: "/wallet", label: "Wallet", icon: "💰" },
];

const CREATOR_NAV = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/offers", label: "Offers", icon: "🎯" },
  { href: "/deals", label: "My Deals", icon: "🤝" },
  { href: "/wallet", label: "Wallet", icon: "💰" },
];

/**
 * Fixed bottom nav for mobile (spec §66/67) — CSS-only visibility via
 * `.mobile-only` (see globals.css), so the same component tree renders
 * for every viewport and there's no separate mobile page/route to keep
 * in sync with the desktop one.
 */
export function BottomNav({ accountType }: { accountType: "BRAND" | "CREATOR" }) {
  const pathname = usePathname();
  const nav = accountType === "BRAND" ? BRAND_NAV : CREATOR_NAV;

  return (
    <nav
      className="mobile-only"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--color-white)",
        borderTop: "1px solid var(--color-border)",
        justifyContent: "space-around",
        padding: "8px 0",
        zIndex: 100,
      }}
    >
      {nav.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              fontSize: 11,
              minWidth: 56,
              minHeight: 44,
              color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
              fontWeight: active ? 600 : 400,
            }}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
