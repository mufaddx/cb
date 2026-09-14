"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "../../../../components/Button";
import { PageLoader } from "../../../../components/PageLoader";
import { BackLink, Field, StatusBadge, formatDateTime, humanize } from "../../../../components/admin/AdminUI";
import { apiFetch, ApiClientError } from "../../../../lib/apiClient";
import { useConfirm } from "../../../../lib/useConfirm";

interface KycDetail {
  id: string;
  documentType: string;
  documentNumber: string;
  documentUrl: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  creator: { id: string; fullName: string; displayName: string };
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

export default function AdminKycDetailPage() {
  const { id } = useParams<{ id: string }>();
  const confirm = useConfirm();
  const [record, setRecord] = useState<KycDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    apiFetch<KycDetail>(`/api/kyc/${id}`)
      .then(setRecord)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load this KYC record."));
  }
  useEffect(load, [id]);

  async function decide(decision: "VERIFIED" | "REJECTED" | "RESUBMISSION_REQUIRED") {
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
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/kyc/${id}/decide`, { method: "POST", body: { decision, reason } });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !record) {
    return (
      <div className="adm-stack">
        <BackLink href="/admin/kyc">Back to KYC reviews</BackLink>
        <p className="error-text">{error}</p>
      </div>
    );
  }
  if (!record) return <PageLoader />;

  const canDecide = record.status === "SUBMITTED" || record.status === "UNDER_REVIEW";
  const isImage = IMAGE_EXT.test(record.documentUrl.split("?")[0]);

  return (
    <div className="adm-stack">
      <BackLink href="/admin/kyc">Back to KYC reviews</BackLink>

      <div className="adm-detail-head">
        <div>
          <h1>{record.creator.fullName}&apos;s KYC</h1>
          <div className="adm-detail-sub">
            <span>@{record.creator.displayName}</span>
            <span className="adm-chip">{humanize(record.documentType)}</span>
            <StatusBadge status={record.status} />
          </div>
        </div>
        {canDecide && (
          <div className="adm-detail-actions">
            <Button variant="secondary" disabled={busy} onClick={() => decide("RESUBMISSION_REQUIRED")}>Ask to resubmit</Button>
            <Button variant="danger" disabled={busy} onClick={() => decide("REJECTED")}>Reject</Button>
            <Button loading={busy} onClick={() => decide("VERIFIED")}>Verify</Button>
          </div>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}

      {record.rejectionReason && (
        <div className="adm-demo-banner" role="note">
          <span><strong>Note on file:</strong> {record.rejectionReason}</span>
        </div>
      )}

      <div className="adm-detail-grid">
        <div className="adm-panel" style={{ padding: 20 }}>
          <div className="adm-field-label" style={{ marginBottom: 10 }}>Uploaded document</div>
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={record.documentUrl} alt={`${humanize(record.documentType)} uploaded by ${record.creator.fullName}`} className="adm-doc-preview" />
          ) : (
            <a href={record.documentUrl} target="_blank" rel="noreferrer" className="adm-doc-fallback">
              <strong>Open the uploaded file</strong>
              <span>This file type can&apos;t be previewed inline — opens in a new tab.</span>
            </a>
          )}
        </div>

        <div className="adm-panel" style={{ padding: 20, display: "grid", gap: 16, alignContent: "start" }}>
          <Field label="Document type" value={humanize(record.documentType)} />
          <Field label="Document number" value={record.documentNumber} />
          <Field label="Submitted" value={formatDateTime(record.submittedAt)} />
          <Field label="Reviewed" value={formatDateTime(record.reviewedAt)} />
        </div>
      </div>
    </div>
  );
}
