"use client";

import { useEffect, useState } from "react";
import { PageHeading } from "@/components/PageHeading";
import { PageLoader } from "@/components/PageLoader";
import { StatCard } from "@/components/StatCard";
import { CheckCircleIcon, MegaphoneIcon, TargetIcon, TrendingUpIcon, WalletIcon } from "@/components/icons";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

interface Campaign {
  status: string;
  type: string;
  pricingSnapshots: Array<{ totalAmount: string }>;
}

const LIVE_STATUSES = new Set(["LIVE", "MATCHING", "IN_PROGRESS"]);
const SPENT_STATUSES = new Set(["PAID", "LIVE", "MATCHING", "IN_PROGRESS", "COMPLETED"]);

const STATUS_ORDER = ["DRAFT", "PENDING_REVIEW", "LIVE", "MATCHING", "IN_PROGRESS", "COMPLETED", "REJECTED", "CANCELLED"];
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending Review",
  LIVE: "Live",
  MATCHING: "Matching",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

/** Brand-only. Every number here is derived straight from the same
 * /api/campaigns list the Dashboard and Campaigns pages already fetch
 * — no separate analytics/reporting backend exists yet, so rather than
 * fabricate charts this reuses real data and presents it as honest
 * summary tiles + a status breakdown instead of inventing time-series
 * data nothing here actually tracks. */
export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Campaign[]>("/api/campaigns")
      .then(setCampaigns)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load campaigns."));
  }, []);

  if (error) {
    return (
      <main style={{ padding: 32 }}>
        <p className="error-text">{error}</p>
      </main>
    );
  }

  if (!campaigns) return <PageLoader />;

  const totalSpend = campaigns
    .filter((c) => SPENT_STATUSES.has(c.status))
    .reduce((sum, c) => sum + Number(c.pricingSnapshots[0]?.totalAmount ?? 0), 0);
  const completed = campaigns.filter((c) => c.status === "COMPLETED").length;
  const active = campaigns.filter((c) => LIVE_STATUSES.has(c.status)).length;
  const completionRate = campaigns.length > 0 ? Math.round((completed / campaigns.length) * 100) : null;
  const avgSpend = campaigns.length > 0 ? totalSpend / campaigns.length : null;

  const byStatus = new Map<string, number>();
  for (const c of campaigns) byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1);
  const maxCount = Math.max(1, ...Array.from(byStatus.values()));

  const byType = new Map<string, number>();
  for (const c of campaigns) byType.set(c.type, (byType.get(c.type) ?? 0) + 1);

  return (
    <main style={{ padding: 32 }}>
      <PageHeading
        icon={TrendingUpIcon}
        tint="blue"
        title="Analytics"
        description="Real numbers pulled from your own campaigns — no separate reporting setup needed."
      />

      {campaigns.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>No campaigns yet.</p>
          <p className="helper-text" style={{ marginTop: 4 }}>
            Launch your first campaign and this page fills in with real numbers.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
            <StatCard icon={MegaphoneIcon} tint="purple" label="Total Campaigns" value={campaigns.length} />
            <StatCard icon={TargetIcon} tint="blue" label="Active Now" value={active} />
            <StatCard icon={CheckCircleIcon} tint="green" label="Completion Rate" value={completionRate != null ? `${completionRate}%` : "—"} />
            <StatCard icon={WalletIcon} tint="pink" label="Avg. Spend / Campaign" value={avgSpend != null ? `₹${Math.round(avgSpend).toLocaleString("en-IN")}` : "—"} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            <div className="card">
              <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15 }}>Campaigns by Status</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {STATUS_ORDER.filter((s) => byStatus.has(s)).map((status) => {
                  const count = byStatus.get(status) ?? 0;
                  return (
                    <div key={status}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                        <span>{STATUS_LABEL[status] ?? status}</span>
                        <span style={{ fontWeight: 600 }}>{count}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "var(--color-bg-subtle)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(count / maxCount) * 100}%`, background: "var(--gradient-brand)", borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15 }}>Total Spend</h3>
              <div style={{ fontSize: 30, fontWeight: 750, marginBottom: 4 }}>₹{totalSpend.toLocaleString("en-IN")}</div>
              <p className="helper-text" style={{ marginBottom: 20 }}>Across every paid/live/completed campaign.</p>
              <h3 style={{ marginBottom: 12, fontSize: 15 }}>By Campaign Type</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Array.from(byType.entries()).map(([type, count]) => (
                  <div key={type} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                    <span>{type.replace(/_/g, " ")}</span>
                    <span style={{ fontWeight: 600 }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
