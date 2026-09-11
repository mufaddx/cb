"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { InstagramConnect } from "@/components/InstagramConnect";

interface Me {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  brand: { companyName: string } | null;
  creator: { displayName: string } | null;
}

interface Wallet {
  availableBalance: string;
  reservedBalance: string;
}

interface Campaign {
  status: string;
  pricingSnapshots: Array<{ totalAmount: string }>;
}

interface Assignment {
  status: string;
  payoutAmount: string;
}

interface WalletTx {
  type: string;
  amount: string;
}

const LIVE_STATUSES = new Set(["LIVE", "MATCHING", "IN_PROGRESS"]);
const SPENT_STATUSES = new Set(["PAID", "LIVE", "MATCHING", "IN_PROGRESS", "COMPLETED"]);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: "16px 18px", flex: "1 1 150px" }}>
      <div className="helper-text" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [walletTx, setWalletTx] = useState<WalletTx[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Me>("/api/auth/me")
      .then((m) => {
        setMe(m);
        if (m.brand) {
          apiFetch<Campaign[]>("/api/campaigns").then(setCampaigns).catch(() => setCampaigns([]));
        } else {
          apiFetch<Assignment[]>("/api/assignments").then(setAssignments).catch(() => setAssignments([]));
          apiFetch<WalletTx[]>("/api/wallet/transactions").then(setWalletTx).catch(() => setWalletTx([]));
        }
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load your account."));
  }, []);

  useEffect(() => {
    apiFetch<Wallet>("/api/wallet").catch(() => null).then((w) => w && setWallet(w));
  }, []);

  if (error) {
    return (
      <main style={{ padding: "32px" }}>
        <p className="error-text">{error}</p>
      </main>
    );
  }

  if (!me) {
    return <main style={{ padding: "32px" }}>Loading…</main>;
  }

  const accountType = me.brand ? "BRAND" : "CREATOR";

  const totalSpend = campaigns
    ?.filter((c) => SPENT_STATUSES.has(c.status))
    .reduce((sum, c) => sum + Number(c.pricingSnapshots[0]?.totalAmount ?? 0), 0);

  const paidAssignments = assignments?.filter((a) => a.status === "PAID") ?? [];
  const completionRate = assignments && assignments.length > 0 ? Math.round((paidAssignments.length / assignments.length) * 100) : null;
  const lifetimeEarnings = walletTx
    ? walletTx.reduce((sum, t) => sum + (t.type === "CREATOR_EARNING" ? Number(t.amount) : t.type === "FEE" ? -Number(t.amount) : 0), 0)
    : null;

  return (
    <>
      <main style={{ padding: "32px" }}>
        <h1>Good morning, {me.brand?.companyName ?? me.creator?.displayName ?? me.name ?? me.email}</h1>

        {accountType === "BRAND" ? (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "20px 0" }}>
            <Stat label="Total campaigns" value={campaigns ? String(campaigns.length) : "—"} />
            <Stat label="Active now" value={campaigns ? String(campaigns.filter((c) => LIVE_STATUSES.has(c.status)).length) : "—"} />
            <Stat label="Completed" value={campaigns ? String(campaigns.filter((c) => c.status === "COMPLETED").length) : "—"} />
            <Stat label="Total spend" value={totalSpend != null ? `₹${totalSpend.toLocaleString("en-IN")}` : "—"} />
          </div>
        ) : (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "20px 0" }}>
            <Stat label="Active deals" value={assignments ? String(assignments.filter((a) => a.status !== "PAID").length) : "—"} />
            <Stat label="Completed" value={String(paidAssignments.length)} />
            <Stat label="Completion rate" value={completionRate != null ? `${completionRate}%` : "—"} />
            <Stat label="Lifetime earnings" value={lifetimeEarnings != null ? `₹${lifetimeEarnings.toLocaleString("en-IN")}` : "—"} />
          </div>
        )}

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
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
            <>
              <InstagramConnect />
              <div className="card" style={{ maxWidth: 360, flex: "1 1 280px" }}>
                <h3>Offers</h3>
                <p className="helper-text" style={{ marginBottom: 12 }}>See campaign offers waiting for you.</p>
                <Link href="/offers" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                  View offers →
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
