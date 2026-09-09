"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, clearTokens } from "../lib/apiClient";
import { BottomNav } from "./BottomNav";

const BRAND_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/shipments", label: "Shipments" },
  { href: "/wallet", label: "Wallet" },
];

const CREATOR_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/offers", label: "Offers" },
  { href: "/deals", label: "My Deals" },
  { href: "/wallet", label: "Wallet" },
];

/**
 * Shared chrome for brand/creator pages (not the admin console, which
 * has its own sidebar). Desktop gets a top nav; mobile (spec §66) gets
 * a fixed bottom nav instead of a shrunken version of the same one —
 * both are rendered here so every page just writes <AppHeader /> once
 * and gets the right layout at every width via CSS, not two code paths.
 */
export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [accountType, setAccountType] = useState<"BRAND" | "CREATOR" | null>(null);

  useEffect(() => {
    apiFetch<{ brand: unknown; creator: unknown }>("/api/auth/me")
      .then((me) => setAccountType(me.brand ? "BRAND" : "CREATOR"))
      .catch(() => null);
  }, []);

  const nav = accountType === "BRAND" ? BRAND_NAV : accountType === "CREATOR" ? CREATOR_NAV : [];

  return (
    <>
      <header style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-white)" }}>
        <div
          className="container"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <strong>Antigravity</strong>
            <nav className="desktop-only" style={{ display: "flex", gap: 20 }}>
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    fontSize: 14,
                    fontWeight: pathname === item.href ? 600 : 400,
                    color: pathname === item.href ? "var(--color-primary)" : "var(--color-text)",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <button
            onClick={() => {
              clearTokens();
              router.push("/login");
            }}
            style={{ background: "none", border: "none", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}
          >
            Log out
          </button>
        </div>
      </header>
      {accountType && <BottomNav accountType={accountType} />}
    </>
  );
}
