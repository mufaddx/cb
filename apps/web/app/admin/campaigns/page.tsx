"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
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

export default function CampaignReviewsPage() {
  const confirm = useConfirm();
  const [queue, setQueue] = useState<ReviewCampaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  function load() {
    apiFetch<ReviewCampaign[]>("/api/campaigns/review-queue")
      .then(setQueue)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load the queue."));
  }
  useEffect(load, []);

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
      load();
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
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  if (!queue) return <p>Loading…</p>;

  return (
    <div>
      <p className="helper-text" style={{ marginBottom: 20 }}>{queue.length} pending</p>
      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      {queue.length === 0 ? (
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
      )}
    </div>
  );
}
