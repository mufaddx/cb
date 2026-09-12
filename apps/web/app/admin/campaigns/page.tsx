"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import { PageLoader } from "../../../components/PageLoader";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { useConfirm } from "../../../lib/useConfirm";

interface ReviewCampaign {
  id: string;
  code: string;
  title: string;
  type: string;
  status: string;
  submittedAt: string | null;
  brand: { companyName: string };
  pricingSnapshots: Array<{ totalAmount: string }>;
}

interface TargetingSlab {
  id: string;
  minValue: number;
  maxValue: number | null;
  quantity: number;
  reserved: number;
}
interface LiveCampaign {
  id: string;
  code: string;
  title: string;
  type: string;
  status: string;
  liveAt: string | null;
  brand: { companyName: string };
  targetingSlabs: TargetingSlab[];
}
interface MatchingResult {
  campaignId: string;
  offersCreated: number;
  perSlab: Array<{ slabId: string; requested: number; matched: number; stillShort: number }>;
}

function slabLabel(s: TargetingSlab): string {
  const min = s.minValue.toLocaleString("en-IN");
  return s.maxValue == null ? `${min}+` : `${min} – ${s.maxValue.toLocaleString("en-IN")}`;
}

const TABS = [
  { key: "review", label: "Pending Review" },
  { key: "live", label: "Live Campaigns" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function CampaignReviewsPage() {
  const confirm = useConfirm();
  const [tab, setTab] = useState<TabKey>("review");
  const [queue, setQueue] = useState<ReviewCampaign[] | null>(null);
  const [live, setLive] = useState<LiveCampaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [matchResults, setMatchResults] = useState<Record<string, MatchingResult>>({});

  function loadQueue() {
    apiFetch<ReviewCampaign[]>("/api/campaigns/review-queue")
      .then(setQueue)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load the queue."));
  }
  function loadLive() {
    apiFetch<LiveCampaign[]>("/api/campaigns/live")
      .then(setLive)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load live campaigns."));
  }
  useEffect(() => {
    loadQueue();
    loadLive();
  }, []);

  async function approve(id: string, title: string) {
    const confirmed = await confirm({
      title: "Approve this campaign?",
      description: `"${title}" will move to Payment Pending — the brand is notified to pay.`,
    });
    if (!confirmed) return;

    setActingOn(id);
    setError(null);
    try {
      await apiFetch(`/api/campaigns/${id}/approve`, { method: "POST" });
      loadQueue();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  async function reject(id: string, title: string) {
    const reason = await confirm({
      title: "Reject this campaign?",
      description: `"${title}" will be sent back to the brand as REJECTED.`,
      impact: "The brand will need to revise and resubmit it.",
      danger: true,
      confirmLabel: "Reject",
      requireInput: true,
      inputLabel: "Reason (shown to the brand)",
      minInputLength: 5,
    });
    if (typeof reason !== "string") return;

    setActingOn(id);
    setError(null);
    try {
      await apiFetch(`/api/campaigns/${id}/reject`, { method: "POST", body: { reason } });
      loadQueue();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  async function runMatching(id: string, title: string) {
    const confirmed = await confirm({
      title: "Run matching?",
      description: `Sends offers to every eligible creator still needed to fill "${title}"'s open slabs. Safe to run more than once — it only tops up slabs still short, never re-offers a creator who already has one.`,
    });
    if (!confirmed) return;

    setActingOn(id);
    setError(null);
    try {
      const result = await apiFetch<MatchingResult>(`/api/campaigns/${id}/match`, { method: "POST" });
      setMatchResults((prev) => ({ ...prev, [id]: result }));
      loadLive();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  if (!queue || !live) return <PageLoader />;

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--color-border)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === t.key ? "2px solid var(--color-primary)" : "2px solid transparent",
              padding: "10px 14px",
              marginBottom: -1,
              fontSize: 13.5,
              fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? "var(--color-primary)" : "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >
            {t.label} ({t.key === "review" ? queue.length : live.length})
          </button>
        ))}
      </div>

      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      {tab === "review" &&
        (queue.length === 0 ? (
          <div className="card">No campaigns awaiting review.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {queue.map((c) => (
              <div key={c.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{c.code} · {c.type}</div>
                  <div style={{ fontWeight: 600 }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{c.brand.companyName}</div>
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  <div style={{ fontWeight: 600 }}>₹{c.pricingSnapshots[0]?.totalAmount ?? "—"}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button loading={actingOn === c.id} onClick={() => approve(c.id, c.title)}>
                      Approve
                    </Button>
                    <Button variant="danger" loading={actingOn === c.id} onClick={() => reject(c.id, c.title)}>
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

      {tab === "live" &&
        (live.length === 0 ? (
          <div className="card">No live campaigns right now.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {live.map((c) => {
              const totalQuantity = c.targetingSlabs.reduce((s, sl) => s + sl.quantity, 0);
              const totalReserved = c.targetingSlabs.reduce((s, sl) => s + sl.reserved, 0);
              const fullyMatched = totalQuantity > 0 && totalReserved >= totalQuantity;
              const result = matchResults[c.id];
              return (
                <div key={c.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{c.code} · {c.type} · {c.status}</div>
                      <div style={{ fontWeight: 600 }}>{c.title}</div>
                      <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{c.brand.companyName}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 600, marginBottom: 8, color: fullyMatched ? "var(--color-success)" : "var(--color-text)" }}>
                        {totalReserved}/{totalQuantity} matched
                      </div>
                      <Button loading={actingOn === c.id} disabled={fullyMatched} onClick={() => runMatching(c.id, c.title)}>
                        {fullyMatched ? "Fully matched" : "Run Matching"}
                      </Button>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {c.targetingSlabs.map((s) => (
                      <span key={s.id} className="badge">
                        {slabLabel(s)}: {s.reserved}/{s.quantity}
                      </span>
                    ))}
                  </div>

                  {result && (
                    <div className="helper-text" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
                      Last run: {result.offersCreated} offer{result.offersCreated === 1 ? "" : "s"} sent —{" "}
                      {result.perSlab.map((p) => `${p.matched}/${p.requested} matched`).join(", ")}
                      {result.perSlab.some((p) => p.stillShort > 0) &&
                        " (some slabs are still short on eligible creators)."}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}
