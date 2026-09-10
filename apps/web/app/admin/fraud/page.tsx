"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { useConfirm } from "../../../lib/useConfirm";

interface FraudItem {
  id: string;
  entityType: string;
  entityId: string;
  flagType: string;
  riskScore: string;
  status: string;
  createdAt: string;
}

export default function FraudQueuePage() {
  const confirm = useConfirm();
  const [queue, setQueue] = useState<FraudItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  function load() {
    apiFetch<FraudItem[]>("/api/fraud/queue")
      .then(setQueue)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load the queue."));
  }
  useEffect(load, []);

  async function review(id: string, decision: "CLEARED" | "RESTRICTED") {
    const notes = await confirm({
      title: decision === "RESTRICTED" ? "Restrict this entity?" : "Clear this flag?",
      description:
        decision === "RESTRICTED"
          ? "Sets the creator's availability to PAUSED — this can be reversed manually later."
          : "No change to the entity — the flag is just marked reviewed.",
      impact: decision === "RESTRICTED" ? "The creator becomes ineligible for new campaign matching until un-paused." : undefined,
      danger: decision === "RESTRICTED",
      confirmLabel: decision === "RESTRICTED" ? "Restrict" : "Clear",
      requireInput: true,
      inputLabel: "Review notes (optional, enter at least a space if skipping)",
      minInputLength: 0,
    });
    if (typeof notes !== "string") return;
    setActingOn(id);
    setError(null);
    try {
      await apiFetch(`/api/fraud/${id}/review`, { method: "POST", body: { decision, notes } });
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
      <p className="helper-text" style={{ marginBottom: 20 }}>
        {queue.length} open flag(s) — raising a flag never restricts anything by itself; only an explicit review does.
      </p>
      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      {queue.length === 0 ? (
        <div className="card">No open fraud flags.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {queue.map((item) => (
            <div key={item.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{item.entityType} · {item.entityId}</div>
                <div style={{ fontWeight: 600 }}>{item.flagType}</div>
                <div style={{ fontSize: 13, color: "var(--color-warning)" }}>Risk score: {item.riskScore}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="secondary" loading={actingOn === item.id} onClick={() => review(item.id, "CLEARED")}>
                  Clear
                </Button>
                <Button variant="danger" loading={actingOn === item.id} onClick={() => review(item.id, "RESTRICTED")}>
                  Restrict
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
