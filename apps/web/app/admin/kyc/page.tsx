"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { useConfirm } from "../../../lib/useConfirm";

interface KycItem {
  id: string;
  documentType: string;
  status: string;
  submittedAt: string;
  creator: { fullName: string; displayName: string };
}

export default function KycQueuePage() {
  const confirm = useConfirm();
  const [queue, setQueue] = useState<KycItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  function load() {
    apiFetch<KycItem[]>("/api/kyc/queue")
      .then(setQueue)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load the queue."));
  }
  useEffect(load, []);

  async function decide(id: string, decision: "VERIFIED" | "REJECTED" | "RESUBMISSION_REQUIRED") {
    let reason: string | undefined;
    if (decision === "VERIFIED") {
      const confirmed = await confirm({ title: "Verify this KYC submission?", description: "The creator becomes eligible for withdrawals." });
      if (!confirmed) return;
    } else {
      const result = await confirm({
        title: decision === "REJECTED" ? "Reject this KYC submission?" : "Request resubmission?",
        description: "Shown to the creator as the reason for this decision.",
        danger: decision === "REJECTED",
        confirmLabel: decision === "REJECTED" ? "Reject" : "Request resubmission",
        requireInput: true,
        inputLabel: "Reason",
        minInputLength: 3,
      });
      if (typeof result !== "string") return;
      reason = result;
    }
    setActingOn(id);
    setError(null);
    try {
      await apiFetch(`/api/kyc/${id}/decide`, { method: "POST", body: { decision, reason } });
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
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>KYC Reviews</h1>
      <p className="helper-text" style={{ marginBottom: 20 }}>{queue.length} pending</p>
      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      {queue.length === 0 ? (
        <div className="card">No KYC submissions pending.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {queue.map((item) => (
            <div key={item.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{item.documentType}</div>
                <div style={{ fontWeight: 600 }}>{item.creator.fullName} (@{item.creator.displayName})</div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                  Submitted {new Date(item.submittedAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button loading={actingOn === item.id} onClick={() => decide(item.id, "VERIFIED")}>
                  Verify
                </Button>
                <Button variant="secondary" loading={actingOn === item.id} onClick={() => decide(item.id, "RESUBMISSION_REQUIRED")}>
                  Request Resubmission
                </Button>
                <Button variant="danger" loading={actingOn === item.id} onClick={() => decide(item.id, "REJECTED")}>
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
