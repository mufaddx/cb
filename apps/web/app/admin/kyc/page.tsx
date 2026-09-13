"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import { PageLoader } from "../../../components/PageLoader";
import { AdminEmpty, AdminIntro, Avatar, DemoBanner, DemoTag, StatusBadge, formatDate, humanize } from "../../../components/admin/AdminUI";
import { IdCardIcon } from "../../../components/icons";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { DEMO_KYC, isDemoId, withDemo } from "../../../lib/adminDemo";
import { useConfirm } from "../../../lib/useConfirm";

interface KycItem {
  id: string;
  documentType: string;
  status: string;
  submittedAt: string;
  creator: { fullName: string; displayName: string };
}

export default function KycQueuePage() {
  const confirm = useConfirm();
  const [queue, setQueue] = useState<KycItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  function load() {
    apiFetch<KycItem[]>("/api/kyc/queue")
      .then(setQueue)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Failed to load the queue.");
        setQueue([]);
      });
  }
  useEffect(load, []);

  async function decide(id: string, decision: "VERIFIED" | "REJECTED" | "RESUBMISSION_REQUIRED") {
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
    setActingOn(id);
    setError(null);
    try {
      await apiFetch(`/api/kyc/${id}/decide`, { method: "POST", body: { decision, reason } });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  const { items, isDemo } = withDemo(queue, DEMO_KYC, { allow: !error });
  if (!items) return <PageLoader />;

  return (
    <div className="adm-stack">
      <AdminIntro icon={IdCardIcon} tint="blue" meta={<span className="adm-chip">{isDemo ? 0 : items.length} pending</span>}>
        Check the identity documents creators upload. A creator must be KYC-verified before they can withdraw their earnings.
      </AdminIntro>
      <DemoBanner show={isDemo} />
      {error && <p className="error-text">{error}</p>}

      {items.length === 0 ? (
        <AdminEmpty icon={IdCardIcon} title="No KYC submissions pending" text="New identity documents from creators will appear here for review." />
      ) : (
        <div className="adm-list">
          {items.map((item) => {
            const demo = isDemoId(item.id);
            return (
              <div key={item.id} className={`adm-row${demo ? " is-demo" : ""}`}>
                <div className="adm-row-main">
                  <Avatar name={item.creator.fullName} />
                  <div style={{ minWidth: 0 }}>
                    <div className="adm-row-meta">
                      <StatusBadge status={item.status} label="Awaiting review" />
                      <span className="adm-chip">{humanize(item.documentType)}</span>
                      {demo && <DemoTag />}
                    </div>
                    <div className="adm-row-title">{item.creator.fullName}</div>
                    <div className="adm-row-sub">
                      @{item.creator.displayName} · Submitted {formatDate(item.submittedAt)}
                    </div>
                  </div>
                </div>
                <div className="adm-row-side">
                  <Button variant="secondary" disabled={demo} loading={actingOn === item.id} onClick={() => decide(item.id, "RESUBMISSION_REQUIRED")}>
                    Ask to resubmit
                  </Button>
                  <Button variant="danger" disabled={demo} loading={actingOn === item.id} onClick={() => decide(item.id, "REJECTED")}>
                    Reject
                  </Button>
                  <Button disabled={demo} loading={actingOn === item.id} onClick={() => decide(item.id, "VERIFIED")}>
                    Verify
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
