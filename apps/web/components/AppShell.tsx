"use client";

import { createContext, useContext, useEffect, useRef, useState, type DependencyList, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, clearTokens } from "../lib/apiClient";
import { AccountMenu } from "./AccountMenu";
import { BottomNav } from "./BottomNav";
import { NotificationBell } from "./NotificationBell";
import {
  ChatIcon,
  GearIcon,
  HandshakeIcon,
  HomeIcon,
  InstagramIcon,
  LogOutIcon,
  MegaphoneIcon,
  MenuIcon,
  SearchIcon,
  SparkIcon,
  TargetIcon,
  TrendingUpIcon,
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
  { href: "/analytics", label: "Analytics", icon: TrendingUpIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];

const CREATOR_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/instagram", label: "Instagram", icon: InstagramIcon },
  { href: "/offers", label: "Offers", icon: TargetIcon },
  { href: "/deals", label: "My Deals", icon: HandshakeIcon },
  { href: "/messages", label: "Messages", icon: ChatIcon },
  { href: "/wallet", label: "Wallet", icon: WalletIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || "https://vidlix.in";

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
 * Persistent app shell for brand/creator pages.
 *
 * The creator experience got a dedicated visual pass (search/command
 * palette in the header, an account menu, a sidebar tagline + upgrade
 * card, a real pending-offers badge) that the brand side intentionally
 * does NOT get here — brand keeps the exact header/sidebar it already
 * had. Every `accountType === "CREATOR"` branch below is additive;
 * removing it entirely would put brand and creator back to identical
 * chrome, which is what this file looked like before.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(readCachedMe);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [headerExtra, setHeaderExtra] = useState<ReactNode>(null);
  const [pendingOffers, setPendingOffers] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<Me>("/api/auth/me")
      .then((m) => {
        setMe(m);
        try {
          localStorage.setItem(ME_CACHE_KEY, JSON.stringify(m));
        } catch {
          // Storage can throw (private mode, quota, disabled) — the
          // cache is a pure UX nicety, losing it just means the next
          // load falls back to the network-only behavior below.
        }
      })
      .catch(() => {
        // A real failure (or a session that's no longer valid)
        // shouldn't leave a stale identity/nav cached for next time.
        setMe(null);
        try {
          localStorage.removeItem(ME_CACHE_KEY);
        } catch {
          // ignore
        }
      });
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

  // A real (if modest) count — how many offers are actually waiting on
  // this creator — rather than a placeholder number. Not polled as
  // aggressively as notifications since it's sidebar chrome, not a
  // live feed.
  useEffect(() => {
    if (accountType !== "CREATOR") return;
    function loadPending() {
      apiFetch<Array<{ status: string }>>("/api/campaign-offers")
        .then((offers) => setPendingOffers(offers.filter((o) => o.status === "OFFERED" || o.status === "VIEWED").length))
        .catch(() => null);
    }
    loadPending();
    const timer = setInterval(loadPending, 60_000);
    return () => clearInterval(timer);
  }, [accountType]);

  // Cmd/Ctrl+K focuses the header search from anywhere on the page,
  // matching the shortcut hint shown next to it.
  useEffect(() => {
    if (!accountType) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [accountType]);

  useEffect(() => {
    if (!searchOpen) return;
    function onClickAway(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [searchOpen]);

  const searchResults = nav.filter((item) => item.label.toLowerCase().includes(search.trim().toLowerCase()));

  function goToSearchResult(href: string) {
    router.push(href);
    setSearch("");
    setSearchOpen(false);
  }

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

  const isCreator = accountType === "CREATOR";
  const isLoggedIn = accountType !== null;
  const proCardHref = isCreator ? `${MARKETING_URL}/for-creators` : `${MARKETING_URL}/for-brands`;

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
          style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 10px 10px", color: "var(--color-text)" }}
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
          <span>
            <span style={{ display: "block", fontSize: 17, fontWeight: 750, letterSpacing: "-0.02em" }}>Vidlix</span>
            {isLoggedIn && (
              <span style={{ display: "block", fontSize: 10.5, color: "var(--color-text-faint)", fontWeight: 600 }}>
                Create. Collaborate. Grow.
              </span>
            )}
          </span>
        </Link>
        {isLoggedIn && <div style={{ height: 16 }} />}

        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            const badge = isCreator && item.href === "/offers" ? pendingOffers : null;
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
                <span style={{ flex: 1 }}>{item.label}</span>
                {!!badge && (
                  <span
                    style={{
                      minWidth: 18,
                      height: 18,
                      padding: "0 5px",
                      borderRadius: 9,
                      background: "var(--color-danger)",
                      color: "#fff",
                      fontSize: 10.5,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {isLoggedIn && (
          <a
            href={proCardHref}
            target="_blank"
            rel="noreferrer"
            className="paper-modal"
            style={{ display: "block", padding: 14, marginBottom: 14, textDecoration: "none", color: "var(--color-text)" }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: 8,
                background: "var(--tint-amber-bg)",
                color: "var(--tint-amber-fg)",
                marginBottom: 8,
              }}
              aria-hidden="true"
            >
              <SparkIcon width={14} height={14} />
            </span>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Grow with Vidlix</div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-secondary)", marginBottom: 8 }}>
              {isCreator ? "See tips for landing more brand deals." : "See tips for running better campaigns."}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary)" }}>Learn more →</span>
          </a>
        )}

        <div
          style={{ borderTop: "1px solid var(--color-border)", paddingTop: 14, marginTop: isLoggedIn ? 0 : 14, display: "flex", alignItems: "center", gap: 10 }}
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <button
              className="mobile-only"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              style={{ background: "none", border: "none", color: "var(--color-text)", padding: 6, alignItems: "center", borderRadius: 8, marginLeft: -6 }}
            >
              <MenuIcon width={20} height={20} />
            </button>

            {isLoggedIn && pageTitle && (
              <span style={{ fontWeight: 700, fontSize: 15, flexShrink: 0, whiteSpace: "nowrap" }}>{pageTitle}</span>
            )}
            {isLoggedIn ? (
              <div ref={searchBoxRef} className="desktop-only" style={{ position: "relative", maxWidth: 420, width: "100%" }}>
                <SearchIcon
                  width={16}
                  height={16}
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-faint)", pointerEvents: "none" }}
                />
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchResults[0]) goToSearchResult(searchResults[0].href);
                    if (e.key === "Escape") {
                      setSearchOpen(false);
                      searchInputRef.current?.blur();
                    }
                  }}
                  placeholder="Search pages…"
                  aria-label="Search pages"
                  className="input"
                  style={{ paddingLeft: 36, paddingRight: 52, height: 38 }}
                />
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: "var(--color-text-faint)",
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 5,
                    padding: "2px 5px",
                  }}
                >
                  Ctrl K
                </span>
                {searchOpen && search.trim() && (
                  <div className="paper-modal" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, padding: 6, zIndex: 200 }}>
                    {searchResults.length === 0 ? (
                      <div className="helper-text" style={{ padding: "8px 10px" }}>
                        No pages match &quot;{search}&quot;.
                      </div>
                    ) : (
                      searchResults.map((item) => (
                        <button
                          key={item.href}
                          onClick={() => goToSearchResult(item.href)}
                          className="account-menu-item"
                        >
                          <item.icon width={16} height={16} /> {item.label}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <span>{pageTitle}</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {headerExtra}
            {accountType && <NotificationBell />}
            {isLoggedIn && <AccountMenu initial={initial} settingsHref="/settings" />}
          </div>
        </div>
        {children}
      </main>

      {accountType && <BottomNav accountType={accountType} />}
    </div>
    </PageHeaderExtraContext.Provider>
  );
}

// The nav/sidebar reads entirely off `me` (accountType decides which
// list, BRAND_NAV or CREATOR_NAV) — with no cache, every refresh or
// hard navigation started this at null and left the sidebar rendered
// with an empty nav (just the logo, no links) until /api/auth/me
// answered, reading as "the sidebar disappeared". Caching the last
// known `me` in localStorage lets the nav render correctly on the very
// first paint, with the network call only there to reconcile it
// afterward — the same stale-while-revalidate trade every page that
// remembers who you are makes.
const ME_CACHE_KEY = "vidlix:me";

function readCachedMe(): Me | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ME_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Me) : null;
  } catch {
    return null;
  }
}
