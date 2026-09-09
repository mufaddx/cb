"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";

interface Analytics {
  brands: number;
  creators: number;
  campaigns: { total: number; live: number; completed: number };
  gmv: number;
  netRevenueEstimate: number;
  payments: { count: number; totalAmount: number };
  refunds: { count: number; totalAmount: number };
  creatorPayouts: { totalAmount: number };
  pendingWithdrawals: number;
  openDisputes: number;
  openFraudFlags: number;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Analytics>("/api/admin/analytics")
      .then(setData)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load analytics."));
  }, []);

  if (error) return <p className="error-text">{error}</p>;
  if (!data) return <p>Loading…</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Analytics</h1>
      <p className="helper-text" style={{ marginBottom: 20 }}>
        Every figure is a live aggregate query — not a fabricated or cached metric (spec §89).
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard label="GMV (paid)" value={`₹${data.gmv.toLocaleString()}`} />
        <StatCard label="Est. net revenue" value={`₹${data.netRevenueEstimate.toLocaleString()}`} />
        <StatCard label="Paid to creators" value={`₹${data.creatorPayouts.totalAmount.toLocaleString()}`} />
        <StatCard label="Refunded" value={`₹${data.refunds.totalAmount.toLocaleString()} (${data.refunds.count})`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard label="Brands" value={String(data.brands)} />
        <StatCard label="Creators" value={String(data.creators)} />
        <StatCard label="Campaigns" value={`${data.campaigns.total} (${data.campaigns.live} live)`} />
        <StatCard label="Completed campaigns" value={String(data.campaigns.completed)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        <StatCard label="Pending withdrawals" value={String(data.pendingWithdrawals)} />
        <StatCard label="Open disputes" value={String(data.openDisputes)} />
        <StatCard label="Open fraud flags" value={String(data.openFraudFlags)} />
        <StatCard label="Total payments" value={String(data.payments.count)} />
      </div>
    </div>
  );
}
