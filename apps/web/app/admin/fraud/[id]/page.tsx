"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "../../../../components/Button";
import { PageLoader } from "../../../../components/PageLoader";
import { BackLink, Field, StatusBadge, formatDateTime, humanize } from "../../../../components/admin/AdminUI";
import { apiFetch, ApiClientError } from "../../../../lib/apiClient";
import { useConfirm } from "../../../../lib/useConfirm";

interface FraudDetail {
  id: string;
  entityType: string;
  entityId: string;
  flagType: string;
  riskScore: string;
  status: string;
  evidenceJson: unknown;
  createdAt: string;
  resolvedAt: string | null;
}

// Where "View" for the flagged entity itself should point, when we
// have a matching admin detail page for that entity type.
const ENTITY_LINK: Partial<Record<string, string>> = {
  CREATOR: "/admin/creators",
  BRAND: "/admin/brands",
  CAMPAIGN: "/admin/campaigns",
  PAYMENT: "/admin/payments",
};

function riskBadge(score: number) {
  const status = score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";
  return <StatusBadge status={status} label={`Risk ${score} · ${status.toLowerCase()}`} />;
}

export default function AdminFraudDetailPage() {
  const { id } = useParams<{ id: string }>();
  const confirm = useConfirm();
  const [flag, setFlag] = useState<FraudDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    apiFetch<FraudDetail>(`/api/fraud/${id}`)
      .then(setFlag)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load this flag."));
  }
  useEffect(load, [id]);

  async function review(decision: "CLEARED" | "RESTRICTED") {
    const notes = await confirm({
      title: decision === "RESTRICTED" ? "Restrict this entity?" : "Clear this flag?",
      description:
        decision === "RESTRICTED"
          ? "Sets the creator's availability to PAUSED — this can be reversed manually later."
          : "No change to the entity — the flag is just marked reviewed.",
      danger: decision === "RESTRICTED",
      confirmLabel: decision === "RESTRICTED" ? "Restrict" : "Clear",
      requireInput: true,
      inputLabel: "Review notes (optional, enter at least a space if skipping)",
      minInputLength: 0,
    });
    if (typeof notes !== "string") return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/fraud/${id}/review`, { method: "POST", body: { decision, notes } });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !flag) {
    return (
      <div className="adm-stack">
        <BackLink href="/admin/fraud">Back to fraud &amp; risk</BackLink>
        <p className="error-text">{error}</p>
      </div>
    );
  }
  if (!flag) return <PageLoader />;

  const canAct = flag.status === "OPEN" || flag.status === "REVIEWED";
  const entityBase = ENTITY_LINK[flag.entityType];

  return (
    <div className="adm-stack">
      <BackLink href="/admin/fraud">Back to fraud &amp; risk</BackLink>

      <div className="adm-detail-head">
        <div>
          <h1>{humanize(flag.flagType)}</h1>
          <div className="adm-detail-sub">
            {riskBadge(Number(flag.riskScore))}
            <StatusBadge status={flag.status} />
          </div>
        </div>
        {canAct && (
          <div className="adm-detail-actions">
            <Button variant="secondary" disabled={busy} onClick={() => review("CLEARED")}>Clear flag</Button>
            <Button variant="danger" loading={busy} onClick={() => review("RESTRICTED")}>Restrict account</Button>
          </div>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}

      <div className="adm-panel" style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "14px 20px" }}>
        <Field
          label="Flagged entity"
          value={entityBase ? <Link href={`${entityBase}/${flag.entityId}`} className="adm-view-link">{humanize(flag.entityType)} →</Link> : `${humanize(flag.entityType)} (${flag.entityId})`}
        />
        <Field label="Flagged" value={formatDateTime(flag.createdAt)} />
        <Field label="Reviewed" value={formatDateTime(flag.resolvedAt)} />
        {Boolean(flag.evidenceJson) && (
          <Field label="Evidence" value={<pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12.5 }}>{JSON.stringify(flag.evidenceJson, null, 2)}</pre>} full />
        )}
      </div>
    </div>
  );
}
