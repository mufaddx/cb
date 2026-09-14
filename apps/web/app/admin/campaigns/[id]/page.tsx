"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "../../../../components/Button";
import { PageLoader } from "../../../../components/PageLoader";
import { AdminIntro, Avatar, BackLink, Field, FieldList, StatusBadge, formatDate, formatINR, humanize } from "../../../../components/admin/AdminUI";
import { MegaphoneIcon } from "../../../../components/icons";
import { apiFetch, ApiClientError } from "../../../../lib/apiClient";
import { useConfirm } from "../../../../lib/useConfirm";

interface TargetingSlab {
  id: string;
  minValue: number;
  maxValue: number | null;
  quantity: number;
  reserved: number;
  payoutAmount: string;
}
interface PricingSnapshot {
  subtotal: string;
  platformFee: string;
  taxAmount: string;
  totalAmount: string;
}
interface PaymentRow {
  id: string;
  status: string;
  amount: string;
  createdAt: string;
}
interface AssignmentRow {
  id: string;
  status: string;
  payoutAmount: string;
  creator: { fullName: string; displayName: string };
}
interface CampaignDetail {
  id: string;
  code: string;
  title: string;
  description: string;
  type: string;
  status: string;
  platform: string;
  disclosureRequired: boolean;
  retentionDays: number;
  createdAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  liveAt: string | null;
  rejectionReason: string | null;
  brand: { id: string; companyName: string };
  targetingSlabs: TargetingSlab[];
  pricingSnapshots: PricingSnapshot[];
  payments: PaymentRow[];
  assignments: AssignmentRow[];
}

function slabLabel(s: TargetingSlab): string {
  const min = s.minValue.toLocaleString("en-IN");
  return s.maxValue == null ? `${min}+` : `${min} – ${s.maxValue.toLocaleString("en-IN")}`;
}

export default function AdminCampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const confirm = useConfirm();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sourceVideoUrl, setSourceVideoUrl] = useState<string | null>(null);
  const [sourceVideoError, setSourceVideoError] = useState<string | null>(null);

  function load() {
    apiFetch<CampaignDetail>(`/api/campaigns/${id}`)
      .then(setCampaign)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load this campaign."));
  }
  useEffect(load, [id]);

  // Clipping campaigns carry the brand's source video as briefJson's
  // sourceAssetKey — an admin reviewing/approving needs to actually
  // watch it, not just see that a key exists.
  useEffect(() => {
    if (campaign?.type !== "CLIPPING") return;
    apiFetch<{ url: string }>(`/api/campaigns/${id}/source-asset`)
      .then((r) => setSourceVideoUrl(r.url))
      .catch((err) => setSourceVideoError(err instanceof ApiClientError ? err.message : "Couldn't load the source video."));
  }, [campaign?.type, id]);

  async function approve() {
    if (!campaign) return;
    const confirmed = await confirm({ title: "Approve this campaign?", description: `"${campaign.title}" will move to Payment Pending — the brand is notified to pay.` });
    if (!confirmed) return;
    setBusy(true);
    try {
      await apiFetch(`/api/campaigns/${id}/approve`, { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!campaign) return;
    const reason = await confirm({
      title: "Reject this campaign?",
      description: `"${campaign.title}" will be sent back to the brand as REJECTED.`,
      danger: true,
      confirmLabel: "Reject",
      requireInput: true,
      inputLabel: "Reason (shown to the brand)",
      minInputLength: 5,
    });
    if (typeof reason !== "string") return;
    setBusy(true);
    try {
      await apiFetch(`/api/campaigns/${id}/reject`, { method: "POST", body: { reason } });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !campaign) {
    return (
      <div className="adm-stack">
        <BackLink href="/admin/campaigns">Back to campaigns</BackLink>
        <p className="error-text">{error}</p>
      </div>
    );
  }
  if (!campaign) return <PageLoader />;

  const snapshot = campaign.pricingSnapshots[0];
  const canDecide = campaign.status === "UNDER_REVIEW";

  return (
    <div className="adm-stack">
      <BackLink href="/admin/campaigns">Back to campaigns</BackLink>

      <div className="adm-detail-head">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={campaign.brand.companyName} square />
          <div>
            <h1>{campaign.title}</h1>
            <div className="adm-detail-sub">
              <span>{campaign.code}</span>
              <span>·</span>
              <Link href={`/admin/brands/${campaign.brand.id}`} className="adm-view-link">{campaign.brand.companyName}</Link>
              <span className="adm-chip">{humanize(campaign.type)}</span>
              <StatusBadge status={campaign.status} />
            </div>
          </div>
        </div>
        {canDecide && (
          <div className="adm-detail-actions">
            <Button variant="danger" loading={busy} onClick={reject}>Reject</Button>
            <Button loading={busy} onClick={approve}>Approve</Button>
          </div>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}

      {campaign.rejectionReason && (
        <div className="adm-demo-banner" role="note">
          <span>
            <strong>Rejected:</strong> {campaign.rejectionReason}
          </span>
        </div>
      )}

      <div className="adm-detail-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {campaign.type === "CLIPPING" && (
            <div className="adm-panel" style={{ padding: 20 }}>
              <div className="adm-field-label" style={{ marginBottom: 10 }}>Source video</div>
              {sourceVideoUrl ? (
                <video src={sourceVideoUrl} controls className="adm-doc-preview" style={{ maxHeight: 480 }} />
              ) : sourceVideoError ? (
                <div className="adm-doc-fallback">{sourceVideoError}</div>
              ) : (
                <div className="adm-doc-fallback">Loading video…</div>
              )}
            </div>
          )}

          <div className="adm-panel" style={{ padding: 20 }}>
            <FieldList>
              <Field label="Platform" value={humanize(campaign.platform)} />
              <Field label="Disclosure required" value={campaign.disclosureRequired ? "Yes" : "No"} />
              <Field label="Retention window" value={campaign.retentionDays > 0 ? `${campaign.retentionDays} days` : "None"} />
              <Field label="Submitted" value={formatDate(campaign.submittedAt)} />
              <Field label="Description" value={campaign.description || "—"} full />
            </FieldList>
          </div>

          <div className="adm-panel">
            <div className="adm-panel-head">
              <h3>Targeting bands</h3>
            </div>
            {campaign.targetingSlabs.length === 0 ? (
              <p className="adm-panel-empty">No targeting bands yet — set once the campaign is approved and paid.</p>
            ) : (
              campaign.targetingSlabs.map((s) => (
                <div key={s.id} className="adm-panel-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 650, fontSize: 13.5 }}>Band {slabLabel(s)}</div>
                    <div className="helper-text">{formatINR(s.payoutAmount)} payout per creator</div>
                  </div>
                  <span className="adm-chip">{s.reserved}/{s.quantity} matched</span>
                </div>
              ))
            )}
          </div>

          <div className="adm-panel">
            <div className="adm-panel-head">
              <h3>Creators on this campaign ({campaign.assignments.length})</h3>
            </div>
            {campaign.assignments.length === 0 ? (
              <p className="adm-panel-empty">No creator has been matched to this campaign yet.</p>
            ) : (
              campaign.assignments.map((a) => (
                <Link key={a.id} href={`/admin/assignments/${a.id}`} className="adm-panel-row" style={{ color: "inherit" }}>
                  <Avatar name={a.creator.fullName} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 650, fontSize: 13.5 }}>{a.creator.fullName}</div>
                    <div className="helper-text">@{a.creator.displayName} · {formatINR(a.payoutAmount)}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              ))
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {snapshot && (
            <div className="adm-panel" style={{ padding: 18 }}>
              <div className="adm-field-label">Total campaign value</div>
              <div style={{ fontSize: 24, fontWeight: 750, marginTop: 4 }}>{formatINR(snapshot.totalAmount)}</div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }} className="helper-text">
                <span>Subtotal: {formatINR(snapshot.subtotal)}</span>
                <span>Platform fee: {formatINR(snapshot.platformFee)}</span>
                <span>Tax: {formatINR(snapshot.taxAmount)}</span>
              </div>
            </div>
          )}

          <div className="adm-panel">
            <div className="adm-panel-head">
              <h3>Payments</h3>
            </div>
            {campaign.payments.length === 0 ? (
              <p className="adm-panel-empty">No payment yet.</p>
            ) : (
              campaign.payments.map((p) => (
                <Link key={p.id} href={`/admin/payments/${p.id}`} className="adm-panel-row" style={{ color: "inherit" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 650, fontSize: 13.5 }}>{formatINR(p.amount)}</div>
                    <div className="helper-text">{formatDate(p.createdAt)}</div>
                  </div>
                  <StatusBadge status={p.status} />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
