"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

interface Campaign {
  id: string;
  code: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "var(--color-text-secondary)",
  SUBMITTED: "var(--color-warning)",
  UNDER_REVIEW: "var(--color-warning)",
  REJECTED: "var(--color-danger)",
  APPROVED: "var(--color-success)",
  PAYMENT_PENDING: "var(--color-warning)",
  PAID: "var(--color-success)",
  LIVE: "var(--color-success)",
  MATCHING: "var(--color-primary)",
  IN_PROGRESS: "var(--color-primary)",
  COMPLETED: "var(--color-success)",
  CANCELLED: "var(--color-text-secondary)",
  DISPUTED: "var(--color-danger)",
  REFUNDED: "var(--color-text-secondary)",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Campaign[]>("/api/campaigns")
      .then(setCampaigns)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load campaigns."));
  }, []);

  if (error) return <p className="error-text">{error}</p>;

  return (
    <>
      <main className="container" style={{ padding: "48px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1>Campaigns</h1>
          <Link href="/campaigns/create">
            <Button>+ Create Campaign</Button>
          </Link>
        </div>

        {!campaigns ? (
          <p>Loading…</p>
        ) : campaigns.length === 0 ? (
          <div className="card">
            <p style={{ margin: 0 }}>No campaigns yet.</p>
            <p className="helper-text" style={{ marginBottom: 12 }}>
              Launch your first campaign to start working with creators.
            </p>
            <Link href="/campaigns/create">
              <Button>Create Campaign</Button>
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {campaigns.map((c) => (
              <Link key={c.id} href={`/campaigns/${c.id}`} className="card" style={{ display: "flex", justifyContent: "space-between", textDecoration: "none", color: "inherit" }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{c.code} · {c.type}</div>
                  <div style={{ fontWeight: 600 }}>{c.title}</div>
                </div>
                <div style={{ color: STATUS_COLORS[c.status] ?? "var(--color-text)", fontWeight: 600, fontSize: 13 }}>
                  {c.status}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
