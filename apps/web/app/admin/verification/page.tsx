"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { useConfirm } from "../../../lib/useConfirm";

interface VerificationItem {
  id: string;
  postUrl: string | null;
  campaign: { title: string; code: string };
  creator: { displayName: string };
  postVerifications: Array<{ checkType: string; result: string; evidenceJson: unknown }>;
}

export default function VerificationQueuePage() {
  const confirm = useConfirm();
  const [queue, setQueue] = useState<VerificationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  function load() {
    apiFetch<VerificationItem[]>("/api/verifications/queue")
      .then(setQueue)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load the queue."));
  }
  useEffect(load, []);

  async function decide(assignmentId: string, decision: "PASS" | "FAIL") {
    let notes: string | undefined;
    if (decision === "FAIL") {
      const result = await confirm({
        title: "Fail this verification?",
        description: "The assignment will be marked FAILED — no payout will be released for it.",
        danger: true,
        confirmLabel: "Fail",
        requireInput: true,
        inputLabel: "Reason",
        minInputLength: 3,
      });
      if (typeof result !== "string") return;
      notes = result;
    } else {
      const confirmed = await confirm({ title: "Pass this verification?", description: "The assignment moves toward payout." });
      if (!confirmed) return;
    }
    setActingOn(assignmentId);
    setError(null);
    try {
      await apiFetch(`/api/verifications/${assignmentId}/decide`, { method: "POST", body: { decision, notes } });
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
      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      {queue.length === 0 ? (
        <div className="card">Nothing awaiting manual verification.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {queue.map((item) => (
            <div key={item.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{item.campaign.code}</div>
                  <div style={{ fontWeight: 600 }}>{item.campaign.title}</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>@{item.creator.displayName}</div>
                  {item.postUrl && (
                    <a href={item.postUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                      {item.postUrl}
                    </a>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Button loading={actingOn === item.id} onClick={() => decide(item.id, "PASS")}>
                    Pass
                  </Button>
                  <Button variant="danger" loading={actingOn === item.id} onClick={() => decide(item.id, "FAIL")}>
                    Fail
                  </Button>
                </div>
              </div>
              {item.postVerifications.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 12, color: "var(--color-text-secondary)" }}>
                  Automated checks: {item.postVerifications.map((c) => `${c.checkType}: ${c.result}`).join(" · ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
