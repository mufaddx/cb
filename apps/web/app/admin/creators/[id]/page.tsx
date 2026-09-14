"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageLoader } from "../../../../components/PageLoader";
import { AdminIntro, Avatar, BackLink, Field, FieldList, StatusBadge, formatDate, humanize } from "../../../../components/admin/AdminUI";
import { MegaphoneIcon, UsersIcon } from "../../../../components/icons";
import { apiFetch, ApiClientError } from "../../../../lib/apiClient";

interface Assignment {
  id: string;
  status: string;
  payoutAmount: string;
  createdAt: string;
  campaign: { id: string; code: string; title: string; type: string };
}
interface KycRecordSummary {
  id: string;
  status: string;
  submittedAt: string;
  documentType: string;
}
interface CreatorDetail {
  id: string;
  fullName: string;
  displayName: string;
  phone: string | null;
  bio: string | null;
  location: string | null;
  availability: string;
  kycStatus: string;
  qualityScore: string;
  completionRate: string;
  retentionRate: string;
  riskScore: string;
  createdAt: string;
  instagramAccount: { username: string; status: string; snapshots: Array<{ followers: number; avgReach: number | null }> } | null;
  categories: Array<{ category: { name: string } }>;
  assignments: Assignment[];
  kycRecords: KycRecordSummary[];
}

function riskTone(score: number) {
  return score >= 70 ? "var(--color-danger)" : score >= 40 ? "#b45309" : "var(--color-success)";
}

export default function AdminCreatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [creator, setCreator] = useState<CreatorDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<CreatorDetail>(`/api/admin/creators/${id}`)
      .then(setCreator)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load this creator."));
  }, [id]);

  if (error) {
    return (
      <div className="adm-stack">
        <BackLink href="/admin/creators">Back to creators</BackLink>
        <p className="error-text">{error}</p>
      </div>
    );
  }
  if (!creator) return <PageLoader />;

  const snapshot = creator.instagramAccount?.snapshots[0];
  const latestKyc = creator.kycRecords[0];

  return (
    <div className="adm-stack">
      <BackLink href="/admin/creators">Back to creators</BackLink>

      <div className="adm-detail-head">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={creator.fullName} />
          <div>
            <h1>{creator.fullName}</h1>
            <div className="adm-detail-sub">
              <span>@{creator.displayName}</span>
              <span>·</span>
              <span>Joined {formatDate(creator.createdAt)}</span>
              <StatusBadge status={creator.availability} />
            </div>
          </div>
        </div>
      </div>

      <div className="adm-kpis adm-kpis-3">
        <div className="adm-kpi">
          <div className="adm-kpi-label">Quality score</div>
          <div className="adm-kpi-value">{creator.qualityScore}</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi-label">Completion rate</div>
          <div className="adm-kpi-value">{creator.completionRate}%</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi-label">Risk score</div>
          <div className="adm-kpi-value" style={{ color: riskTone(Number(creator.riskScore)) }}>
            {creator.riskScore}
          </div>
        </div>
      </div>

      <div className="adm-detail-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="adm-panel" style={{ padding: 20 }}>
            <FieldList>
              <Field label="Phone" value={creator.phone ?? "—"} />
              <Field label="Location" value={creator.location || "—"} />
              <Field
                label="KYC status"
                value={
                  latestKyc ? (
                    <Link href={`/admin/kyc/${latestKyc.id}`} className="adm-view-link" style={{ display: "inline-flex", gap: 6 }}>
                      <StatusBadge status={latestKyc.status} /> View →
                    </Link>
                  ) : (
                    <StatusBadge status={creator.kycStatus} />
                  )
                }
              />
              <Field
                label="Instagram"
                value={
                  creator.instagramAccount ? (
                    <>
                      @{creator.instagramAccount.username} <StatusBadge status={creator.instagramAccount.status} />
                    </>
                  ) : (
                    <StatusBadge status="NOT_CONNECTED" label="Not connected" />
                  )
                }
              />
              {snapshot && <Field label="Followers" value={snapshot.followers.toLocaleString("en-IN")} />}
              {snapshot && <Field label="Average reach" value={snapshot.avgReach?.toLocaleString("en-IN") ?? "—"} />}
              <Field label="Categories" value={creator.categories.length ? creator.categories.map((c) => c.category.name).join(", ") : "—"} full />
              {creator.bio && <Field label="Bio" value={creator.bio} full />}
            </FieldList>
          </div>

          <div className="adm-panel">
            <div className="adm-panel-head">
              <h3>Campaign history ({creator.assignments.length})</h3>
            </div>
            {creator.assignments.length === 0 ? (
              <p className="adm-panel-empty">No campaigns accepted yet.</p>
            ) : (
              creator.assignments.map((a) => (
                <Link key={a.id} href={`/admin/assignments/${a.id}`} className="adm-panel-row" style={{ color: "inherit" }}>
                  <span className="icon-badge icon-badge-purple" aria-hidden="true">
                    <MegaphoneIcon width={15} height={15} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 650, fontSize: 13.5 }}>{a.campaign.title}</div>
                    <div className="helper-text" style={{ marginTop: 1 }}>
                      {a.campaign.code} · {humanize(a.campaign.type)} · {formatDate(a.createdAt)}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              ))
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="adm-panel" style={{ padding: 18 }}>
            <div className="adm-field-label">Retention rate</div>
            <div style={{ fontSize: 24, fontWeight: 750, marginTop: 4 }}>{creator.retentionRate}%</div>
            <div className="helper-text" style={{ marginTop: 2 }}>How often a post stays up through the required window.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
