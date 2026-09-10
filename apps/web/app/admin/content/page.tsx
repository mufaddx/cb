"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { useConfirm } from "../../../lib/useConfirm";

interface ContentItem {
  id: string;
  campaign: { title: string; code: string };
  creator: { displayName: string };
  contentSubmissions: Array<{ version: number; fileKey: string; status: string }>;
}

export default function ContentReviewQueuePage() {
  const confirm = useConfirm();
  const [queue, setQueue] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  function load() {
    apiFetch<ContentItem[]>("/api/content/queue")
      .then(setQueue)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load the queue."));
  }
  useEffect(load, []);

  async function decide(assignmentId: string, decision: "APPROVE" | "REVISION" | "REJECT") {
    let feedback: string | undefined;
    if (decision === "REVISION") {
      const result = await confirm({
        title: "Request a revision?",
        description: "The assignment goes back to the creator for resubmission.",
        requireInput: true,
        inputLabel: "Feedback for the creator",
        minInputLength: 3,
      });
      if (typeof result !== "string") return;
      feedback = result;
    } else if (decision === "REJECT") {
      const confirmed = await confirm({
        title: "Reject this content?",
        description: "The assignment is marked FAILED — no payout will be released.",
        danger: true,
        confirmLabel: "Reject",
      });
      if (!confirmed) return;
    } else {
      const confirmed = await confirm({
        title: "Approve this content?",
        description: "The assignment moves toward payout (immediately if this campaign has no retention period).",
      });
      if (!confirmed) return;
    }
    setActingOn(assignmentId);
    setError(null);
    try {
      await apiFetch(`/api/content/${assignmentId}/review`, { method: "POST", body: { decision, feedback } });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong — the revision limit may have been reached.");
    } finally {
      setActingOn(null);
    }
  }

  if (!queue) return <p>Loading…</p>;

  return (
    <div>
      <p className="helper-text" style={{ marginBottom: 20 }}>{queue.length} submission(s) awaiting review</p>
      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      {queue.length === 0 ? (
        <div className="card">Nothing awaiting content review.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {queue.map((item) => {
            const latest = item.contentSubmissions[0];
            return (
              <div key={item.id} className="card" style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{item.campaign.code} · v{latest?.version}</div>
                  <div style={{ fontWeight: 600 }}>{item.campaign.title}</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>@{item.creator.displayName}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Button loading={actingOn === item.id} onClick={() => decide(item.id, "APPROVE")}>
                    Approve
                  </Button>
                  <Button variant="secondary" loading={actingOn === item.id} onClick={() => decide(item.id, "REVISION")}>
                    Request Revision
                  </Button>
                  <Button variant="danger" loading={actingOn === item.id} onClick={() => decide(item.id, "REJECT")}>
                    Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
