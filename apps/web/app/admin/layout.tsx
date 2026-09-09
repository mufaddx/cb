"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiClientError, clearTokens } from "../../lib/apiClient";
import { ConfirmProvider } from "../../lib/useConfirm";

const ADMIN_ROLES = ["SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN", "KYC_ADMIN", "CONTENT_REVIEWER", "SUPPORT_ADMIN"];

const NAV = [
  { href: "/admin", label: "Operations Center" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/campaigns", label: "Campaign Reviews" },
  { href: "/admin/creators", label: "Creators" },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/verification", label: "Content Verification" },
  { href: "/admin/content", label: "Creator Content Review" },
  { href: "/admin/retention", label: "Retention" },
  { href: "/admin/kyc", label: "KYC" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/payments", label: "Payments & Refunds" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/fraud", label: "Fraud & Risk" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");
  const [me, setMe] = useState<{ email: string; roles: string[] } | null>(null);

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
        if (err instanceof ApiClientError) {
          setStatus("denied");
        }
      });
  }, []);

  if (status === "checking") {
    return <main style={{ padding: 48 }}>Checking access…</main>;
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

  return (
    <ConfirmProvider>
    <div className="admin-shell" style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        className="admin-sidebar"
        style={{
          width: 240,
          flexShrink: 0,
          background: "var(--color-dark)",
          color: "#fff",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="admin-sidebar-title" style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, padding: "0 8px" }}>
          Antigravity Admin
        </div>
        <nav className="admin-nav" style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? "#fff" : "rgba(255,255,255,0.7)",
                  background: active ? "rgba(255,255,255,0.12)" : "transparent",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="admin-sidebar-footer" style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 16, marginTop: 16 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", padding: "0 8px", marginBottom: 8 }}>
            {me?.email}
          </div>
          <button
            onClick={() => {
              clearTokens();
              router.push("/login");
            }}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.7)",
              fontSize: 13,
              cursor: "pointer",
              padding: "0 8px",
            }}
          >
            Log out
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, background: "var(--color-bg)", minWidth: 0 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 32px 64px" }}>{children}</div>
      </main>
    </div>
    </ConfirmProvider>
  );
}
