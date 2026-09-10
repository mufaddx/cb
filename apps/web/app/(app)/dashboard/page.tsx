"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

interface Me {
  id: string;
  email: string;
  roles: string[];
  brand: { companyName: string } | null;
  creator: { displayName: string } | null;
}

interface Wallet {
  availableBalance: string;
  reservedBalance: string;
}

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Me>("/api/auth/me")
      .then(setMe)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load your account."));
  }, []);

  useEffect(() => {
    apiFetch<Wallet>("/api/wallet").catch(() => null).then((w) => w && setWallet(w));
  }, []);

  if (error) {
    return (
      <main className="container" style={{ padding: "64px 24px" }}>
        <p className="error-text">{error}</p>
      </main>
    );
  }

  if (!me) {
    return <main className="container" style={{ padding: "64px 24px" }}>Loading…</main>;
  }

  const accountType = me.brand ? "BRAND" : "CREATOR";

  return (
    <>
      <main className="container" style={{ padding: "48px 24px" }}>
        <h1>Good morning, {me.brand?.companyName ?? me.creator?.displayName ?? me.email}</h1>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 24 }}>
          <div className="card" style={{ maxWidth: 360, flex: "1 1 280px" }}>
            <h3>Wallet</h3>
            {wallet ? (
              <>
                <p style={{ margin: "4px 0" }}>Available: ₹{wallet.availableBalance}</p>
                <p style={{ margin: "4px 0", color: "var(--color-text-secondary)" }}>Reserved: ₹{wallet.reservedBalance}</p>
              </>
            ) : (
              <p className="helper-text">No wallet yet.</p>
            )}
          </div>
          {accountType === "BRAND" ? (
            <div className="card" style={{ maxWidth: 360, flex: "1 1 280px" }}>
              <h3>Campaigns</h3>
              <p className="helper-text" style={{ marginBottom: 12 }}>Launch and manage your campaigns.</p>
              <Link href="/campaigns" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                View campaigns →
              </Link>
            </div>
          ) : (
            <div className="card" style={{ maxWidth: 360, flex: "1 1 280px" }}>
              <h3>Offers</h3>
              <p className="helper-text" style={{ marginBottom: 12 }}>See campaign offers waiting for you.</p>
              <Link href="/offers" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                View offers →
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
