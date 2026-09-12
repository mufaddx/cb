"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import { PageLoader } from "../../../components/PageLoader";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { useConfirm } from "../../../lib/useConfirm";

interface DisputeItem {
  id: string;
  type: string;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
  campaign: { title: string; code: string };
}

export default function DisputesQueuePage() {
  const confirm = useConfirm();
  const [queue, setQueue] = useState<DisputeItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  function load() {
    apiFetch<DisputeItem[]>("/api/disputes/queue")
      .then(setQueue)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load the queue."));
  }
  useEffect(load, []);

  async function requestEvidence(id: string) {
    const confirmed = await confirm({
      title: "Request evidence for this dispute?",
      description: "Moves the dispute to EVIDENCE_REQUESTED.",
    });
    if (!confirmed) return;

    setActingOn(id);
    setError(null);
    try {
      await apiFetch(`/api/disputes/${id}/request-evidence`, { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  async function decide(id: string) {
    const decision = await confirm({
      title: "Record a decision and resolve this dispute?",
      description: "This does not move money — issue a refund separately (Payments & Refunds) if the decision calls for one.",
      confirmLabel: "Resolve",
      requireInput: true,
      inputLabel: "Decision",
      minInputLength: 5,
    });
    if (typeof decision !== "string") return;

    setActingOn(id);
    setError(null);
    try {
      await apiFetch(`/api/disputes/${id}/decide`, { method: "POST", body: { decision } });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  if (!queue) return <PageLoader />;

  return (
    <div>
      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      {queue.length === 0 ? (
        <div className="card">No open disputes.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {queue.map((item) => (
            <div key={item.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {item.campaign.code} · {item.type} · {item.status}
                  </div>
                  <div style={{ fontWeight: 600 }}>{item.campaign.title}</div>
                  <div style={{ fontSize: 13, margin: "4px 0" }}>{item.reason}</div>
                  <p className="helper-text" style={{ maxWidth: 480 }}>{item.description}</p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Button variant="secondary" loading={actingOn === item.id} onClick={() => requestEvidence(item.id)}>
                    Request Evidence
                  </Button>
                  <Button loading={actingOn === item.id} onClick={() => decide(item.id)}>
                    Decide
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
