"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { PageHeading } from "@/components/PageHeading";
import { PageLoader } from "@/components/PageLoader";
import { FileTextIcon, MegaphoneIcon, SendIcon, UserIcon } from "@/components/icons";
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
    <main style={{ padding: "32px" }}>
      <PageHeading
        icon={MegaphoneIcon}
        tint="purple"
        title="Campaigns"
        description="Create and manage your campaigns to work with amazing creators."
        action={
          !!campaigns?.length && (
            <Link href="/campaigns/create">
              <Button>+ Create Campaign</Button>
            </Link>
          )
        }
      />

      {!campaigns ? (
        <PageLoader />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={MegaphoneIcon}
          tint="purple"
          heading="No campaigns yet."
          description="Launch your first campaign to start working with creators, grow your brand and reach new audiences."
          primary={{ label: "Create Campaign", href: "/campaigns/create" }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, textAlign: "left" }}>
            <div style={{ display: "flex", gap: 10 }}>
              <span className="icon-badge icon-badge-purple" aria-hidden="true"><UserIcon width={16} height={16} /></span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>Set your campaign goals</div>
                <div className="helper-text" style={{ fontSize: 12.5 }}>Tell us what you want to achieve.</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <span className="icon-badge icon-badge-blue" aria-hidden="true"><FileTextIcon width={16} height={16} /></span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>Add campaign details</div>
                <div className="helper-text" style={{ fontSize: 12.5 }}>Define deliverables, budget and timeline.</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <span className="icon-badge icon-badge-green" aria-hidden="true"><SendIcon width={16} height={16} /></span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>Connect with creators</div>
                <div className="helper-text" style={{ fontSize: 12.5 }}>Get applications and start collaborating.</div>
              </div>
            </div>
          </div>
        </EmptyState>
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
  );
}
