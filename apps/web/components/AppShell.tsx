"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, clearTokens } from "../lib/apiClient";
import { BottomNav } from "./BottomNav";
import {
  HandshakeIcon,
  HomeIcon,
  LogOutIcon,
  MegaphoneIcon,
  MoreIcon,
  PackageIcon,
  SparkIcon,
  TargetIcon,
  WalletIcon,
} from "./icons";

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
 * Persistent app shell for brand/creator pages (spec §66/67).
 *
 * Desktop gets a fixed left sidebar. Mobile does NOT get that sidebar
 * squeezed into a horizontal strip (that was the earlier approach —
 * it duplicated BottomNav's links in a cramped, easily-cut-off row).
 * Instead mobile gets its own minimal top bar (logo + a "more" menu
 * for the account/log-out actions BottomNav has no room for) and
 * relies on BottomNav for the primary nav links, the same 4 items the
 * sidebar shows on desktop.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickAway(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [menuOpen]);

  const accountType = me?.brand ? "BRAND" : me?.creator ? "CREATOR" : null;
  const nav = accountType === "BRAND" ? BRAND_NAV : accountType === "CREATOR" ? CREATOR_NAV : [];
  const displayName = me?.brand?.companyName ?? me?.creator?.displayName ?? me?.name ?? me?.email ?? "";
  const initial = displayName ? displayName.trim().charAt(0).toUpperCase() : "";
  const pageTitle = nav.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? "";

  function logout() {
    // Best-effort — invalidates the refresh token server-side so it
    // can't be reused if it were ever stolen, but the local tokens are
    // cleared and the redirect happens regardless of whether this call
    // succeeds (the user should never get stuck unable to log out
    // just because the API was briefly unreachable).
    apiFetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    clearTokens();
    router.push("/login");
  }

  return (
    <div className="app-shell" style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        className="app-sidebar desktop-only"
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

        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
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
              {displayName || " "}
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

      {/* Mobile top bar — logo + a "more" menu for account/log-out,
          since BottomNav below only has room for the 4 nav links. */}
      <header
        className="mobile-only"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 90,
          alignItems: "center",
          justifyContent: "space-between",
          height: 52,
          padding: "0 16px",
          background: "var(--color-dark)",
          color: "#fff",
        }}
      >
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: 7,
              background: "var(--gradient-brand)",
              flexShrink: 0,
            }}
          >
            <SparkIcon width={13} height={13} stroke="#fff" />
          </span>
          <span style={{ fontSize: 15.5, fontWeight: 750 }}>Vidlix</span>
        </Link>

        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More"
            aria-expanded={menuOpen}
            style={{ background: "none", border: "none", color: "#fff", padding: 8, display: "flex", borderRadius: 8 }}
          >
            <MoreIcon width={20} height={20} />
          </button>
          {menuOpen && (
            <div
              className="card"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: 220,
                padding: 14,
                zIndex: 100,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "var(--color-bg-subtle)",
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
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {displayName || " "}
                  </div>
                  {accountType && (
                    <div style={{ fontSize: 11.5, color: "var(--color-text-secondary)" }}>
                      {accountType === "BRAND" ? "Brand account" : "Creator account"}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={logout}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  background: "none",
                  border: "none",
                  padding: "9px 6px",
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--color-danger)",
                  cursor: "pointer",
                }}
              >
                <LogOutIcon width={16} height={16} />
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="app-content" style={{ flex: 1, minWidth: 0, marginLeft: "var(--sidebar-width)" }}>
        {pageTitle && <div className="page-header">{pageTitle}</div>}
        {children}
      </main>

      {accountType && <BottomNav accountType={accountType} />}
    </div>
  );
}
