"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../../../components/Button";
import { PageLoader } from "../../../components/PageLoader";
import { AdminEmpty, AdminIntro, DemoBanner, DemoTag, IconAvatar, StatusBadge, formatDate, humanize } from "../../../components/admin/AdminUI";
import { AlertTriangleIcon } from "../../../components/icons";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { DEMO_FRAUD, isDemoId, withDemo } from "../../../lib/adminDemo";
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

function riskBadge(score: number) {
  const status = score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";
  return <StatusBadge status={status} label={`Risk ${score} · ${status.toLowerCase()}`} />;
}

export default function FraudQueuePage() {
  const confirm = useConfirm();
  const [queue, setQueue] = useState<FraudItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  function load() {
    apiFetch<FraudItem[]>("/api/fraud/queue")
      .then(setQueue)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Failed to load the queue.");
        setQueue([]);
      });
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

  const { items, isDemo } = withDemo(queue, DEMO_FRAUD, { allow: !error });
  if (!items) return <PageLoader />;

  return (
    <div className="adm-stack">
      <AdminIntro icon={AlertTriangleIcon} tint="amber" meta={<span className="adm-chip">{isDemo ? 0 : items.length} open flags</span>}>
        Accounts our risk checks flagged as suspicious (sudden follower spikes, shared UPI IDs and similar). Clear a false
        alarm, or restrict the account so it stops getting new campaigns.
      </AdminIntro>
      <DemoBanner show={isDemo} />
      {error && <p className="error-text">{error}</p>}

      {items.length === 0 ? (
        <AdminEmpty icon={AlertTriangleIcon} title="No open fraud flags" text="Suspicious activity detected by risk checks will show up here for review." />
      ) : (
        <div className="adm-list">
          {items.map((item) => {
            const demo = isDemoId(item.id);
            return (
              <div key={item.id} className={`adm-row${demo ? " is-demo" : ""}`}>
                <div className="adm-row-main">
                  <IconAvatar icon={AlertTriangleIcon} tint="amber" />
                  <div style={{ minWidth: 0 }}>
                    <div className="adm-row-meta">
                      {riskBadge(Number(item.riskScore))}
                      <StatusBadge status={item.status} />
                      {demo && <DemoTag />}
                    </div>
                    <div className="adm-row-title">{humanize(item.flagType)}</div>
                    <div className="adm-row-sub">
                      {humanize(item.entityType)} · ID {item.entityId} · Flagged {formatDate(item.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="adm-row-side">
                  {!demo && <Link href={`/admin/fraud/${item.id}`} className="adm-view-link">View →</Link>}
                  <Button variant="secondary" disabled={demo} loading={actingOn === item.id} onClick={() => review(item.id, "CLEARED")}>
                    Clear flag
                  </Button>
                  <Button variant="danger" disabled={demo} loading={actingOn === item.id} onClick={() => review(item.id, "RESTRICTED")}>
                    Restrict account
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
