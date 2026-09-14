"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "../../../../components/Button";
import { PageLoader } from "../../../../components/PageLoader";
import { Avatar, BackLink, Field, StatusBadge, formatDateTime, formatINR, humanize } from "../../../../components/admin/AdminUI";
import { apiFetch, ApiClientError } from "../../../../lib/apiClient";
import { useConfirm } from "../../../../lib/useConfirm";

interface ContentSubmission {
  id: string;
  version: number;
  status: string;
  fileUrl: string;
  submittedAt: string;
  revisions: Array<{ id: string; feedback: string; createdAt: string }>;
}
interface PostVerification {
  id: string;
  checkType: string;
  result: string;
  automated: boolean;
  checkedAt: string | null;
  evidenceJson: unknown;
}
interface RetentionCheck {
  id: string;
  dayNumber: number;
  checkDate: string;
  status: string;
}
interface AssignmentDetail {
  id: string;
  status: string;
  payoutAmount: string;
  postUrl: string | null;
  postScreenshotUrl: string | null;
  postSubmittedAt: string | null;
  retentionStatus: string;
  retentionRequiredUntil: string | null;
  acceptedAt: string | null;
  verifiedAt: string | null;
  paidAt: string | null;
  campaign: { id: string; code: string; title: string; type: string; brand: { id: string; companyName: string } };
  creator: { id: string; fullName: string; displayName: string; instagramAccount: { username: string; status: string } | null };
  contentSubmissions: ContentSubmission[];
  postVerifications: PostVerification[];
  retentionChecks: RetentionCheck[];
}

const CONTENT_TYPES = ["CREATOR_CONTENT", "PRODUCT_REVIEW"];

export default function AdminAssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const confirm = useConfirm();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    apiFetch<AssignmentDetail>(`/api/assignments/${id}/admin`)
      .then(setAssignment)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load this assignment."));
  }
  useEffect(load, [id]);

  const isContentType = assignment ? CONTENT_TYPES.includes(assignment.campaign.type) : false;
  const isClipping = assignment ? assignment.campaign.type === "CLIPPING" : false;
  const awaitingReview = assignment?.status === "VERIFICATION";
  const awaitingRetention = assignment?.status === "VERIFIED" && (assignment?.retentionStatus === "PENDING" || assignment?.retentionStatus === "IN_PROGRESS");

  async function reviewContent(decision: "APPROVE" | "REVISION" | "REJECT") {
    let feedback: string | undefined;
    if (decision !== "APPROVE") {
      const result = await confirm({
        title: decision === "REJECT" ? "Reject this content?" : "Request a revision?",
        description: "Shown to the creator.",
        danger: decision === "REJECT",
        confirmLabel: decision === "REJECT" ? "Reject" : "Request revision",
        requireInput: true,
        inputLabel: "Feedback",
        minInputLength: 3,
      });
      if (typeof result !== "string") return;
      feedback = result;
    } else {
      const confirmed = await confirm({ title: "Approve this content?", description: "The creator is paid once verification finishes." });
      if (!confirmed) return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/content/${id}/review`, { method: "POST", body: { decision, feedback } });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function decideVerification(decision: "PASS" | "FAIL") {
    const confirmed = await confirm({
      title: decision === "PASS" ? "Pass this post verification?" : "Fail this post verification?",
      description: decision === "PASS" ? "The creator moves toward payout." : "The assignment is marked failed and no payout is released.",
      danger: decision === "FAIL",
    });
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/verifications/${id}/decide`, { method: "POST", body: { decision } });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function runRetentionCheck() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/retention/${id}/check`, { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !assignment) {
    return (
      <div className="adm-stack">
        <BackLink href="/admin/content">Back</BackLink>
        <p className="error-text">{error}</p>
      </div>
    );
  }
  if (!assignment) return <PageLoader />;

  const latestSubmission = assignment.contentSubmissions[0];

  return (
    <div className="adm-stack">
      <BackLink href={isClipping ? "/admin/verification" : "/admin/content"}>Back to {isClipping ? "post verification" : "content review"}</BackLink>

      <div className="adm-detail-head">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={assignment.creator.fullName} />
          <div>
            <h1>{assignment.campaign.title}</h1>
            <div className="adm-detail-sub">
              <span>{assignment.campaign.code}</span>
              <span className="adm-chip">{humanize(assignment.campaign.type)}</span>
              <StatusBadge status={assignment.status} />
            </div>
          </div>
        </div>
        <div className="adm-detail-actions">
          {awaitingReview && isContentType && (
            <>
              <Button variant="secondary" disabled={busy} onClick={() => reviewContent("REVISION")}>Request revision</Button>
              <Button variant="danger" disabled={busy} onClick={() => reviewContent("REJECT")}>Reject</Button>
              <Button loading={busy} onClick={() => reviewContent("APPROVE")}>Approve</Button>
            </>
          )}
          {awaitingReview && isClipping && (
            <>
              <Button variant="danger" disabled={busy} onClick={() => decideVerification("FAIL")}>Fail</Button>
              <Button loading={busy} onClick={() => decideVerification("PASS")}>Pass</Button>
            </>
          )}
          {awaitingRetention && (
            <Button loading={busy} onClick={runRetentionCheck}>Run retention check now</Button>
          )}
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}

      <div className="adm-detail-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isClipping ? (
            <div className="adm-panel" style={{ padding: 20 }}>
              <div className="adm-field-label" style={{ marginBottom: 10 }}>Submitted Instagram post</div>
              {assignment.postUrl ? (
                <p style={{ marginBottom: 12 }}>
                  <a href={assignment.postUrl} target="_blank" rel="noreferrer" className="adm-view-link">{assignment.postUrl} →</a>
                </p>
              ) : (
                <p className="helper-text">No post URL submitted yet.</p>
              )}
              {assignment.postScreenshotUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assignment.postScreenshotUrl} alt="Submitted post screenshot" className="adm-doc-preview" />
              )}
            </div>
          ) : (
            <div className="adm-panel" style={{ padding: 20 }}>
              <div className="adm-field-label" style={{ marginBottom: 10 }}>
                Latest submission {latestSubmission ? `(version ${latestSubmission.version})` : ""}
              </div>
              {latestSubmission ? (
                /\.(mp4|mov|webm)$/i.test(latestSubmission.fileUrl.split("?")[0]) ? (
                  <video src={latestSubmission.fileUrl} controls className="adm-doc-preview" style={{ maxHeight: 480 }} />
                ) : /\.(png|jpe?g|webp|gif)$/i.test(latestSubmission.fileUrl.split("?")[0]) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={latestSubmission.fileUrl} alt="Submitted content" className="adm-doc-preview" />
                ) : (
                  <a href={latestSubmission.fileUrl} target="_blank" rel="noreferrer" className="adm-doc-fallback">
                    <strong>Open the submitted file</strong>
                  </a>
                )
              ) : (
                <p className="helper-text">No content submitted yet.</p>
              )}
            </div>
          )}

          {assignment.contentSubmissions.length > 0 && (
            <div className="adm-panel">
              <div className="adm-panel-head"><h3>Submission history</h3></div>
              {assignment.contentSubmissions.map((s) => (
                <div key={s.id} className="adm-panel-row" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 650, fontSize: 13.5 }}>
                      Version {s.version} · <StatusBadge status={s.status} />
                    </div>
                    <div className="helper-text">Submitted {formatDateTime(s.submittedAt)}</div>
                    {s.revisions.map((r) => (
                      <div key={r.id} className="helper-text" style={{ marginTop: 4 }}>
                        Revision requested: &ldquo;{r.feedback}&rdquo;
                      </div>
                    ))}
                  </div>
                  <a href={s.fileUrl} target="_blank" rel="noreferrer" className="adm-view-link">Open →</a>
                </div>
              ))}
            </div>
          )}

          {assignment.postVerifications.length > 0 && (
            <div className="adm-panel">
              <div className="adm-panel-head"><h3>Verification checks</h3></div>
              {assignment.postVerifications.map((v) => (
                <div key={v.id} className="adm-panel-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 650, fontSize: 13.5 }}>{humanize(v.checkType)} {v.automated ? "(automated)" : "(manual)"}</div>
                    <div className="helper-text">{formatDateTime(v.checkedAt)}</div>
                  </div>
                  <StatusBadge status={v.result} />
                </div>
              ))}
            </div>
          )}

          {assignment.retentionChecks.length > 0 && (
            <div className="adm-panel">
              <div className="adm-panel-head"><h3>Retention checks</h3></div>
              {assignment.retentionChecks.map((r) => (
                <div key={r.id} className="adm-panel-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 650, fontSize: 13.5 }}>Day {r.dayNumber}</div>
                    <div className="helper-text">{formatDateTime(r.checkDate)}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="adm-panel" style={{ padding: 18, display: "grid", gap: 14 }}>
            <Field label="Brand" value={<Link href={`/admin/brands/${assignment.campaign.brand.id}`} className="adm-view-link">{assignment.campaign.brand.companyName}</Link>} />
            <Field label="Creator" value={<Link href={`/admin/creators/${assignment.creator.id}`} className="adm-view-link">{assignment.creator.fullName} (@{assignment.creator.displayName})</Link>} />
            <Field
              label="Instagram"
              value={assignment.creator.instagramAccount ? `@${assignment.creator.instagramAccount.username}` : "Not connected"}
            />
            <Field label="Payout amount" value={formatINR(assignment.payoutAmount)} />
            <Field label="Accepted" value={formatDateTime(assignment.acceptedAt)} />
            <Field label="Verified" value={formatDateTime(assignment.verifiedAt)} />
            <Field label="Paid" value={formatDateTime(assignment.paidAt)} />
            {assignment.retentionRequiredUntil && <Field label="Retention until" value={formatDateTime(assignment.retentionRequiredUntil)} />}
          </div>
        </div>
      </div>
    </div>
  );
}
