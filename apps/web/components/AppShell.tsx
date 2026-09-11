"use client";

import { createContext, useContext, useEffect, useState, type DependencyList, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, clearTokens } from "../lib/apiClient";
import { BottomNav } from "./BottomNav";
import { NotificationBell } from "./NotificationBell";
import {
  ChatIcon,
  HandshakeIcon,
  HomeIcon,
  InstagramIcon,
  LogOutIcon,
  MegaphoneIcon,
  MenuIcon,
  SparkIcon,
  TargetIcon,
  UserIcon,
  WalletIcon,
} from "./icons";

// Products/Shipments aren't primary nav — they're only relevant to
// campaigns that ship a physical product, a minority case. A product
// can be added inline from the campaign form's own "ship a product"
// step, and shipment status shows on the campaign it belongs to
// (campaigns/[id]) — no reason to promote either to a permanent slot
// every brand sees regardless of whether they've ever used it.
const BRAND_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/campaigns", label: "Campaigns", icon: MegaphoneIcon },
  { href: "/creators", label: "Top Creators", icon: UserIcon },
  { href: "/messages", label: "Messages", icon: ChatIcon },
  { href: "/wallet", label: "Wallet", icon: WalletIcon },
];

const CREATOR_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/instagram", label: "Instagram", icon: InstagramIcon },
  { href: "/offers", label: "Offers", icon: TargetIcon },
  { href: "/deals", label: "My Deals", icon: HandshakeIcon },
  { href: "/messages", label: "Messages", icon: ChatIcon },
  { href: "/wallet", label: "Wallet", icon: WalletIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

interface Me {
  email: string;
  name: string | null;
  brand: { companyName: string } | null;
  creator: { displayName: string } | null;
}

// Lets an individual (app) page put something of its own (a badge, a
// button) into the shared page-header bar next to the notification
// bell — e.g. Top Creators' "N credits left / Buy credits" — instead
// of that page maintaining a second, header-shaped bar inside its own
// body. `deps` works exactly like useEffect's: pass every value the
// header content depends on so it updates when they change.
const PageHeaderExtraContext = createContext<(node: ReactNode) => void>(() => {});

export function usePageHeaderExtra(node: ReactNode, deps: DependencyList) {
  const setExtra = useContext(PageHeaderExtraContext);
  useEffect(() => {
    setExtra(node);
    return () => setExtra(null);
    // `node` is deliberately excluded — callers pass their own `deps`
    // (mirroring useEffect) so this only re-runs when something the
    // header content actually depends on changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [headerExtra, setHeaderExtra] = useState<ReactNode>(null);

  useEffect(() => {
    apiFetch<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => null);
  }, []);

  // Auto-close the mobile drawer whenever a nav link changes the route
  // — same pattern as the admin layout's drawer.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

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
    <PageHeaderExtraContext.Provider value={setHeaderExtra}>
    <div className="app-shell" style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        className={`app-sidebar paper-panel${drawerOpen ? " is-open" : ""}`}
        style={{
          width: "var(--sidebar-width)",
          flexShrink: 0,
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          color: "var(--color-text)",
          padding: "22px 14px",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <Link
          href="/dashboard"
          style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 10px 26px", color: "var(--color-text)" }}
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
                  color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                  background: active ? "var(--color-primary-soft)" : "transparent",
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
          style={{ borderTop: "1px solid var(--color-border)", paddingTop: 14, marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}
        >
          <div
            style={{
              width: 30,
              height: 30,
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
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {displayName || " "}
            </div>
            {accountType && (
              <div style={{ fontSize: 11.5, color: "var(--color-text-secondary)" }}>
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
              color: "var(--color-text-secondary)",
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

      {/* Mobile: the sidebar above becomes an off-canvas drawer (same
          mechanic as the admin layout's) instead of a separate mobile
          header duplicating it — a backdrop click, or picking a nav
          link, closes it. */}
      {drawerOpen && (
        <div
          className="mobile-only"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 190 }}
        />
      )}

      <main className="app-content" style={{ flex: 1, minWidth: 0, marginLeft: "var(--sidebar-width)" }}>
        <div className="page-header" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="mobile-only"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              style={{ background: "none", border: "none", color: "var(--color-text)", padding: 6, alignItems: "center", borderRadius: 8, marginLeft: -6 }}
            >
              <MenuIcon width={20} height={20} />
            </button>
            <span>{pageTitle}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {headerExtra}
            {accountType && <NotificationBell />}
          </div>
        </div>
        {children}
      </main>

      {accountType && <BottomNav accountType={accountType} />}
    </div>
    </PageHeaderExtraContext.Provider>
  );
}
