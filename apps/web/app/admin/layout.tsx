"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiClientError, clearTokens } from "../../lib/apiClient";
import { ConfirmProvider } from "../../lib/useConfirm";
import { LogOutIcon, MenuIcon, SparkIcon } from "../../components/icons";

const ADMIN_ROLES = ["SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN", "KYC_ADMIN", "CONTENT_REVIEWER", "SUPPORT_ADMIN"];

const NAV_SECTIONS: Array<{ title: string; items: Array<{ href: string; label: string }> }> = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Operations Center" },
      { href: "/admin/analytics", label: "Analytics" },
    ],
  },
  {
    title: "Campaigns",
    items: [
      { href: "/admin/campaigns", label: "Campaign Reviews" },
      { href: "/admin/verification", label: "Content Verification" },
      { href: "/admin/content", label: "Creator Content Review" },
      { href: "/admin/retention", label: "Retention" },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/admin/creators", label: "Creators" },
      { href: "/admin/brands", label: "Brands" },
      { href: "/admin/kyc", label: "KYC" },
    ],
  },
  {
    title: "Money & Trust",
    items: [
      { href: "/admin/withdrawals", label: "Withdrawals" },
      { href: "/admin/payments", label: "Payments & Refunds" },
      { href: "/admin/disputes", label: "Disputes" },
      { href: "/admin/fraud", label: "Fraud & Risk" },
    ],
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
    return <main style={{ padding: 48 }}>Checking access…</main>;
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
          Log in with an admin account to view the Operations Center.
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

  return (
    <ConfirmProvider>
      <div className="admin-shell" style={{ display: "flex", minHeight: "100vh" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            <span style={{ fontSize: 15.5, fontWeight: 750 }}>Vidlix Admin</span>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            style={{ background: "none", border: "none", color: "#fff", padding: 8, display: "flex", borderRadius: 8 }}
          >
            <MenuIcon width={20} height={20} />
          </button>
        </header>

        {drawerOpen && (
          <div
            className="mobile-only"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 190 }}
          />
        )}

        <aside
          className={`admin-sidebar${drawerOpen ? " is-open" : ""}`}
          style={{
            width: 252,
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
          <div
            className="admin-sidebar-title"
            style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 10px 22px" }}
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
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 16, fontWeight: 750, letterSpacing: "-0.02em" }}>Vidlix</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.02em" }}>ADMIN CONSOLE</div>
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
                    color: "rgba(255,255,255,0.38)",
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
                        style={{
                          padding: "9px 12px",
                          borderRadius: 8,
                          fontSize: 13.5,
                          fontWeight: active ? 600 : 500,
                          color: active ? "#fff" : "rgba(255,255,255,0.68)",
                          background: active ? "rgba(255,255,255,0.10)" : "transparent",
                          whiteSpace: "nowrap",
                          transition: "background-color var(--duration-fast) ease, color var(--duration-fast) ease",
                        }}
                      >
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
              {me?.email.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {me?.email}
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>{roleLabel}</div>
            </div>
            <button
              onClick={() => {
                clearTokens();
                router.push("/login");
              }}
              aria-label="Log out"
              title="Log out"
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: 6, display: "flex", borderRadius: 6 }}
            >
              <LogOutIcon width={17} height={17} />
            </button>
          </div>
        </aside>
        <main className="admin-content" style={{ flex: 1, background: "var(--color-bg)", minWidth: 0, marginLeft: 252 }}>
          <div style={{ maxWidth: 1160, margin: "0 auto", padding: "32px 32px 64px" }}>{children}</div>
        </main>
      </div>
    </ConfirmProvider>
  );
}
