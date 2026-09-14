"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../../../components/Button";
import { PageLoader } from "../../../components/PageLoader";
import { AdminEmpty, AdminIntro, Avatar, DemoBanner, DemoTag, StatusBadge } from "../../../components/admin/AdminUI";
import { FileTextIcon } from "../../../components/icons";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { DEMO_CONTENT, isDemoId, withDemo } from "../../../lib/adminDemo";
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
  const [loadError, setLoadError] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

  function load() {
    apiFetch<ContentItem[]>("/api/content/queue")
      .then(setQueue)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Failed to load the queue.");
        setLoadError(true);
        setQueue([]);
      });
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

  const { items, isDemo } = withDemo(queue, DEMO_CONTENT, { allow: !loadError });
  if (!items) return <PageLoader />;

  return (
    <div className="adm-stack">
      <AdminIntro icon={FileTextIcon} tint="pink" meta={<span className="adm-chip">{isDemo ? 0 : items.length} waiting</span>}>
        Videos creators made for Creator Content campaigns, before they post. Approve them, send them back with feedback for a
        revision, or reject them.
      </AdminIntro>
      <DemoBanner show={isDemo} />
      {error && <p className="error-text">{error}</p>}

      {items.length === 0 ? (
        <AdminEmpty icon={FileTextIcon} title="Nothing awaiting content review" text="Creator submissions for Creator Content campaigns appear here." />
      ) : (
        <div className="adm-list">
          {items.map((item) => {
            const demo = isDemoId(item.id);
            const latest = item.contentSubmissions[0];
            return (
              <div key={item.id} className={`adm-row${demo ? " is-demo" : ""}`}>
                <div className="adm-row-main">
                  <Avatar name={item.creator.displayName} />
                  <div style={{ minWidth: 0 }}>
                    <div className="adm-row-meta">
                      <StatusBadge status="SUBMITTED" label="Awaiting review" />
                      {latest && <span className="adm-chip">Version {latest.version}</span>}
                      {demo && <DemoTag />}
                    </div>
                    <div className="adm-row-title">{item.campaign.title}</div>
                    <div className="adm-row-sub">
                      @{item.creator.displayName} · {item.campaign.code}
                    </div>
                  </div>
                </div>
                <div className="adm-row-side">
                  {!demo && <Link href={`/admin/assignments/${item.id}`} className="adm-view-link">View →</Link>}
                  <Button variant="danger" disabled={demo} loading={actingOn === item.id} onClick={() => decide(item.id, "REJECT")}>
                    Reject
                  </Button>
                  <Button variant="secondary" disabled={demo} loading={actingOn === item.id} onClick={() => decide(item.id, "REVISION")}>
                    Ask for revision
                  </Button>
                  <Button disabled={demo} loading={actingOn === item.id} onClick={() => decide(item.id, "APPROVE")}>
                    Approve
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
