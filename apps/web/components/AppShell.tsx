"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, clearTokens } from "../lib/apiClient";
import { BottomNav } from "./BottomNav";
import { HandshakeIcon, HomeIcon, LogOutIcon, MegaphoneIcon, PackageIcon, SparkIcon, TargetIcon, WalletIcon } from "./icons";

const BRAND_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/campaigns", label: "Campaigns", icon: MegaphoneIcon },
  { href: "/products", label: "Products", icon: PackageIcon },
  { href: "/shipments", label: "Shipments", icon: PackageIcon },
  { href: "/wallet", label: "Wallet", icon: WalletIcon },
];

const CREATOR_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/offers", label: "Offers", icon: TargetIcon },
  { href: "/deals", label: "My Deals", icon: HandshakeIcon },
  { href: "/wallet", label: "Wallet", icon: WalletIcon },
];

interface Me {
  email: string;
  name: string | null;
  brand: { companyName: string } | null;
  creator: { displayName: string } | null;
}

/**
 * Persistent app shell for brand/creator pages (spec §66/67) — a
 * fixed left sidebar on desktop, the existing fixed bottom nav on
 * mobile (both rendered here so a single `(app)` layout gets the
 * right one at every width via CSS, no separate mobile route). Lives
 * in the `(app)` route group's layout.tsx, so it persists across
 * client-side navigation instead of remounting per page like the old
 * per-page <AppHeader /> did.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    apiFetch<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => null);
  }, []);

  const accountType = me?.brand ? "BRAND" : me?.creator ? "CREATOR" : null;
  const nav = accountType === "BRAND" ? BRAND_NAV : accountType === "CREATOR" ? CREATOR_NAV : [];
  const displayName = me?.brand?.companyName ?? me?.creator?.displayName ?? me?.name ?? me?.email ?? "";
  const initial = displayName ? displayName.trim().charAt(0).toUpperCase() : "";

  function logout() {
    clearTokens();
    router.push("/login");
  }

  return (
    <div className="app-shell" style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        className="app-sidebar"
        style={{
          width: "var(--sidebar-width)",
          flexShrink: 0,
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          background: "var(--color-dark)",
          color: "#fff",
          padding: "22px 14px",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <Link
          href="/dashboard"
          className="app-sidebar-title"
          style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 10px 26px", color: "#fff" }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "var(--gradient-brand)",
              flexShrink: 0,
            }}
          >
            <SparkIcon width={16} height={16} stroke="#fff" />
          </span>
          <span style={{ fontSize: 17, fontWeight: 750, letterSpacing: "-0.02em" }}>Vidlix</span>
        </Link>

        <nav className="app-sidebar-nav" style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "10px 12px",
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  color: active ? "#fff" : "rgba(255,255,255,0.68)",
                  background: active ? "rgba(255,255,255,0.10)" : "transparent",
                  whiteSpace: "nowrap",
                  transition: "background-color var(--duration-fast) ease, color var(--duration-fast) ease",
                }}
              >
                <Icon width={17} height={17} style={{ flexShrink: 0, opacity: active ? 1 : 0.85 }} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div
          className="app-sidebar-footer"
          style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 14, marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {initial}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {displayName || " "}
            </div>
            {accountType && (
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>
                {accountType === "BRAND" ? "Brand account" : "Creator account"}
              </div>
            )}
          </div>
          <button
            onClick={logout}
            aria-label="Log out"
            title="Log out"
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              padding: 6,
              display: "flex",
              borderRadius: 6,
            }}
          >
            <LogOutIcon width={17} height={17} />
          </button>
        </div>
      </aside>

      <main className="app-content" style={{ flex: 1, minWidth: 0, marginLeft: "var(--sidebar-width)" }}>
        {children}
      </main>

      {accountType && <BottomNav accountType={accountType} />}
    </div>
  );
}
