"use client";

import type { SVGProps } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiClientError, clearTokens } from "../../lib/apiClient";
import { ConfirmProvider } from "../../lib/useConfirm";
import {
  AlertTriangleIcon,
  BuildingIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  FileTextIcon,
  HomeIcon,
  IdCardIcon,
  LifeBuoyIcon,
  LogOutIcon,
  MegaphoneIcon,
  MenuIcon,
  ScaleIcon,
  SparkIcon,
  TagIcon,
  UsersIcon,
  WalletIcon,
} from "../../components/icons";
import { NotificationBell } from "../../components/NotificationBell";
import { PageLoader } from "../../components/PageLoader";
import "../../styles/admin.css";

const ADMIN_ROLES = ["SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN", "KYC_ADMIN", "CONTENT_REVIEWER", "SUPPORT_ADMIN"];

type NavIcon = (props: SVGProps<SVGSVGElement>) => JSX.Element;

// One Dashboard replaces the old separate "Operations Center" and
// "Analytics" pages: every queue count and money/platform number now
// lives on /admin, each box linking to the page that handles it.
const NAV_SECTIONS: Array<{ title: string; items: Array<{ href: string; label: string; icon: NavIcon }> }> = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: HomeIcon }],
  },
  {
    title: "Campaigns",
    items: [
      { href: "/admin/campaigns", label: "Campaign Reviews", icon: MegaphoneIcon },
      { href: "/admin/content", label: "Content Review", icon: FileTextIcon },
      { href: "/admin/verification", label: "Post Verification", icon: CheckCircleIcon },
      { href: "/admin/retention", label: "Retention Checks", icon: ClockIcon },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/admin/creators", label: "Creators", icon: UsersIcon },
      { href: "/admin/brands", label: "Brands", icon: BuildingIcon },
      { href: "/admin/kyc", label: "KYC Reviews", icon: IdCardIcon },
    ],
  },
  {
    title: "Money & Trust",
    items: [
      { href: "/admin/withdrawals", label: "Withdrawals", icon: WalletIcon },
      { href: "/admin/payments", label: "Payments & Refunds", icon: CreditCardIcon },
      { href: "/admin/disputes", label: "Disputes", icon: ScaleIcon },
      { href: "/admin/fraud", label: "Fraud & Risk", icon: AlertTriangleIcon },
      { href: "/admin/pricing", label: "Pricing & Fees", icon: TagIcon },
    ],
  },
  {
    title: "Support",
    items: [{ href: "/admin/support", label: "Support Tickets", icon: LifeBuoyIcon }],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"checking" | "ok" | "denied" | "error">("checking");
  const [me, setMe] = useState<{ email: string; roles: string[] } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auto-close the mobile drawer whenever a nav link changes the route.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    apiFetch<{ email: string; roles: string[] }>("/api/auth/me")
      .then((user) => {
        if (!user.roles.some((r) => ADMIN_ROLES.includes(r))) {
          setStatus("denied");
          return;
        }
        setMe(user);
        setStatus("ok");
      })
      .catch((err) => {
        // A real "you're logged in but not an admin" gets its own
        // screen below. Anything else (the API unreachable, a network
        // failure) previously fell through and left this stuck on
        // "Checking access…" forever, since neither setStatus call
        // above ever ran — this is that fallback.
        setStatus(err instanceof ApiClientError ? "denied" : "error");
      });
  }, []);

  if (status === "checking") {
    return <PageLoader />;
  }

  if (status === "error") {
    return (
      <main style={{ padding: 48, maxWidth: 480 }}>
        <h1 style={{ fontSize: 22 }}>Couldn&apos;t reach the server</h1>
        <p className="helper-text" style={{ marginBottom: 20 }}>
          The API didn&apos;t respond. Check your connection and try again.
        </p>
        <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
          Go to login →
        </Link>
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main style={{ padding: 48, maxWidth: 480 }}>
        <h1 style={{ fontSize: 22 }}>Admin access required</h1>
        <p className="helper-text" style={{ marginBottom: 20 }}>
          Log in with an admin account to open the admin dashboard.
        </p>
        <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
          Go to login →
        </Link>
      </main>
    );
  }

  const roleLabel = me?.roles.includes("SUPER_ADMIN")
    ? "Super Admin"
    : me?.roles
        .map((r) => r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
        .join(", ") ?? "";

  const pageTitle = NAV_SECTIONS.flatMap((s) => s.items).find((item) => pathname === item.href)?.label ?? "Dashboard";

  return (
    <ConfirmProvider>
      <div className="admin-shell panel-admin" style={{ display: "flex", minHeight: "100vh" }}>
        {drawerOpen && (
          <div
            className="mobile-only"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 190 }}
          />
        )}

        <aside
          className={`admin-sidebar paper-panel${drawerOpen ? " is-open" : ""}`}
          style={{
            width: 252,
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
          <div className="admin-sidebar-title shell-brand">
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
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 16, fontWeight: 750, letterSpacing: "-0.02em", color: "var(--color-text)" }}>Vidlix</div>
              <div style={{ fontSize: 11, color: "var(--color-text-faint)", fontWeight: 600, letterSpacing: "0.02em" }}>ADMIN CONSOLE</div>
            </div>
          </div>

          <nav className="admin-nav" style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            {NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--color-text-faint)",
                    padding: "0 12px 6px",
                  }}
                >
                  {section.title}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {section.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "9px 12px",
                          borderRadius: 8,
                          fontSize: 13.5,
                          fontWeight: active ? 600 : 500,
                          color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                          background: active ? "var(--color-primary-soft)" : "transparent",
                          whiteSpace: "nowrap",
                          transition: "background-color var(--duration-fast) ease, color var(--duration-fast) ease",
                        }}
                      >
                        <item.icon width={16} height={16} style={{ flexShrink: 0, opacity: active ? 1 : 0.8 }} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div
            className="admin-sidebar-footer"
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
              {me?.email.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {me?.email}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-secondary)" }}>{roleLabel}</div>
            </div>
            <button
              onClick={() => {
                apiFetch("/api/auth/logout", { method: "POST" }).catch(() => null);
                clearTokens();
                router.push("/login");
              }}
              aria-label="Log out"
              title="Log out"
              style={{ background: "none", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", padding: 6, display: "flex", borderRadius: 6 }}
            >
              <LogOutIcon width={17} height={17} />
            </button>
          </div>
        </aside>
        <main className="admin-content" style={{ flex: 1, minWidth: 0, marginLeft: 252 }}>
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
            <NotificationBell />
          </div>
          <div className="admin-page-body" style={{ padding: "32px" }}>{children}</div>
        </main>
      </div>
    </ConfirmProvider>
  );
}
