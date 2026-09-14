"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "../../../../components/Button";
import { PageLoader } from "../../../../components/PageLoader";
import { Avatar, BackLink, Field, StatusBadge, formatDateTime, humanize } from "../../../../components/admin/AdminUI";
import { apiFetch, ApiClientError } from "../../../../lib/apiClient";
import { useConfirm } from "../../../../lib/useConfirm";

interface DisputeAssignment {
  id: string;
  status: string;
  creator: { id: string; fullName: string; displayName: string };
}
interface DisputeDetail {
  id: string;
  type: string;
  reason: string;
  description: string;
  status: string;
  decision: string | null;
  createdAt: string;
  resolvedAt: string | null;
  campaign: { id: string; code: string; title: string; brand: { id: string; companyName: string }; assignments: DisputeAssignment[] };
}

export default function AdminDisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const confirm = useConfirm();
  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    apiFetch<DisputeDetail>(`/api/disputes/${id}`)
      .then(setDispute)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load this dispute."));
  }
  useEffect(load, [id]);

  async function requestEvidence() {
    const confirmed = await confirm({ title: "Request evidence for this dispute?", description: "Moves the dispute to EVIDENCE_REQUESTED." });
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/disputes/${id}/request-evidence`, { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function decide() {
    const decision = await confirm({
      title: "Record a decision and resolve this dispute?",
      description: "This does not move money — issue a refund separately (Payments & Refunds) if the decision calls for one.",
      confirmLabel: "Resolve",
      requireInput: true,
      inputLabel: "Decision",
      minInputLength: 5,
    });
    if (typeof decision !== "string") return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/disputes/${id}/decide`, { method: "POST", body: { decision } });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !dispute) {
    return (
      <div className="adm-stack">
        <BackLink href="/admin/disputes">Back to disputes</BackLink>
        <p className="error-text">{error}</p>
      </div>
    );
  }
  if (!dispute) return <PageLoader />;

  const canAct = dispute.status !== "RESOLVED";

  return (
    <div className="adm-stack">
      <BackLink href="/admin/disputes">Back to disputes</BackLink>

      <div className="adm-detail-head">
        <div>
          <h1>{dispute.reason}</h1>
          <div className="adm-detail-sub">
            <span className="adm-chip">{humanize(dispute.type)}</span>
            <StatusBadge status={dispute.status} />
          </div>
        </div>
        {canAct && (
          <div className="adm-detail-actions">
            <Button variant="secondary" disabled={busy} onClick={requestEvidence}>Request evidence</Button>
            <Button loading={busy} onClick={decide}>Record decision</Button>
          </div>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}

      {dispute.decision && (
        <div className="adm-demo-banner" role="note">
          <span><strong>Decision:</strong> {dispute.decision}</span>
        </div>
      )}

      <div className="adm-detail-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="adm-panel" style={{ padding: 20 }}>
            <Field label="Description" value={dispute.description} full />
          </div>

          {dispute.campaign.assignments.length > 0 && (
            <div className="adm-panel">
              <div className="adm-panel-head"><h3>Creators on this campaign</h3></div>
              {dispute.campaign.assignments.map((a) => (
                <Link key={a.id} href={`/admin/assignments/${a.id}`} className="adm-panel-row" style={{ color: "inherit" }}>
                  <Avatar name={a.creator.fullName} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 650, fontSize: 13.5 }}>{a.creator.fullName}</div>
                    <div className="helper-text">@{a.creator.displayName}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="adm-panel" style={{ padding: 18, display: "grid", gap: 14 }}>
          <Field label="Campaign" value={<Link href={`/admin/campaigns/${dispute.campaign.id}`} className="adm-view-link">{dispute.campaign.title}</Link>} />
          <Field label="Brand" value={<Link href={`/admin/brands/${dispute.campaign.brand.id}`} className="adm-view-link">{dispute.campaign.brand.companyName}</Link>} />
          <Field label="Raised" value={formatDateTime(dispute.createdAt)} />
          <Field label="Resolved" value={formatDateTime(dispute.resolvedAt)} />
        </div>
      </div>
    </div>
  );
}
