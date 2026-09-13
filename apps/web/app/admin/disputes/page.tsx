"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import { PageLoader } from "../../../components/PageLoader";
import { AdminEmpty, AdminIntro, DemoBanner, DemoTag, IconAvatar, StatusBadge, formatDate, humanize } from "../../../components/admin/AdminUI";
import { ScaleIcon } from "../../../components/icons";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { DEMO_DISPUTES, isDemoId, withDemo } from "../../../lib/adminDemo";
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
  const [loadError, setLoadError] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

  function load() {
    apiFetch<DisputeItem[]>("/api/disputes/queue")
      .then(setQueue)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Failed to load the queue.");
        setLoadError(true);
        setQueue([]);
      });
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

  const { items, isDemo } = withDemo(queue, DEMO_DISPUTES, { allow: !loadError });
  if (!items) return <PageLoader />;

  return (
    <div className="adm-stack">
      <AdminIntro icon={ScaleIcon} tint="purple" meta={<span className="adm-chip">{isDemo ? 0 : items.length} open</span>}>
        Disagreements between a brand and a creator on a campaign. Ask for evidence if you need more detail, then record a
        decision to resolve it. Refunds, if any, are issued from Payments &amp; Refunds.
      </AdminIntro>
      <DemoBanner show={isDemo} />
      {error && <p className="error-text">{error}</p>}

      {items.length === 0 ? (
        <AdminEmpty icon={ScaleIcon} title="No open disputes" text="When a brand or creator raises a dispute on a campaign, it appears here." />
      ) : (
        <div className="adm-list">
          {items.map((item) => {
            const demo = isDemoId(item.id);
            return (
              <div key={item.id} className={`adm-row${demo ? " is-demo" : ""}`}>
                <div className="adm-row-main" style={{ alignItems: "flex-start" }}>
                  <IconAvatar icon={ScaleIcon} tint="purple" />
                  <div style={{ minWidth: 0 }}>
                    <div className="adm-row-meta">
                      <StatusBadge status={item.status} />
                      <span className="adm-chip">{humanize(item.type)}</span>
                      {demo && <DemoTag />}
                    </div>
                    <div className="adm-row-title">{item.reason}</div>
                    <div className="adm-row-sub">
                      {item.campaign.title} · {item.campaign.code} · Raised {formatDate(item.createdAt)}
                    </div>
                    <p className="adm-row-note">{item.description}</p>
                  </div>
                </div>
                <div className="adm-row-side">
                  <Button variant="secondary" disabled={demo} loading={actingOn === item.id} onClick={() => requestEvidence(item.id)}>
                    Request evidence
                  </Button>
                  <Button disabled={demo} loading={actingOn === item.id} onClick={() => decide(item.id)}>
                    Record decision
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
