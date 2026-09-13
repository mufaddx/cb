"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import { PageLoader } from "../../../components/PageLoader";
import { AdminEmpty, AdminIntro, Avatar, DemoBanner, DemoTag, StatusBadge, humanize } from "../../../components/admin/AdminUI";
import { CheckCircleIcon } from "../../../components/icons";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { DEMO_VERIFICATIONS, isDemoId, withDemo } from "../../../lib/adminDemo";
import { useConfirm } from "../../../lib/useConfirm";

interface VerificationItem {
  id: string;
  postUrl: string | null;
  campaign: { title: string; code: string };
  creator: { displayName: string };
  postVerifications: Array<{ checkType: string; result: string; evidenceJson: unknown }>;
}

export default function VerificationQueuePage() {
  const confirm = useConfirm();
  const [queue, setQueue] = useState<VerificationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

  function load() {
    apiFetch<VerificationItem[]>("/api/verifications/queue")
      .then(setQueue)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Failed to load the queue.");
        setLoadError(true);
        setQueue([]);
      });
  }
  useEffect(load, []);

  async function decide(assignmentId: string, decision: "PASS" | "FAIL") {
    let notes: string | undefined;
    if (decision === "FAIL") {
      const result = await confirm({
        title: "Fail this verification?",
        description: "The assignment will be marked FAILED — no payout will be released for it.",
        danger: true,
        confirmLabel: "Fail",
        requireInput: true,
        inputLabel: "Reason",
        minInputLength: 3,
      });
      if (typeof result !== "string") return;
      notes = result;
    } else {
      const confirmed = await confirm({ title: "Pass this verification?", description: "The assignment moves toward payout." });
      if (!confirmed) return;
    }
    setActingOn(assignmentId);
    setError(null);
    try {
      await apiFetch(`/api/verifications/${assignmentId}/decide`, { method: "POST", body: { decision, notes } });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  const { items, isDemo } = withDemo(queue, DEMO_VERIFICATIONS, { allow: !loadError });
  if (!items) return <PageLoader />;

  return (
    <div className="adm-stack">
      <AdminIntro icon={CheckCircleIcon} tint="green" meta={<span className="adm-chip">{isDemo ? 0 : items.length} waiting</span>}>
        Posts creators have published for a campaign. Automated checks run first; open the post and pass or fail it when a
        check couldn&apos;t decide on its own. A failed post gets no payout.
      </AdminIntro>
      <DemoBanner show={isDemo} />
      {error && <p className="error-text">{error}</p>}

      {items.length === 0 ? (
        <AdminEmpty icon={CheckCircleIcon} title="Nothing awaiting manual verification" text="Published posts that need a human pass or fail appear here." />
      ) : (
        <div className="adm-list">
          {items.map((item) => {
            const demo = isDemoId(item.id);
            return (
              <div key={item.id} className={`adm-row${demo ? " is-demo" : ""}`}>
                <div className="adm-row-main" style={{ alignItems: "flex-start" }}>
                  <Avatar name={item.creator.displayName} />
                  <div style={{ minWidth: 0 }}>
                    <div className="adm-row-meta">
                      <StatusBadge status="PENDING_REVIEW" label="Needs manual check" />
                      {demo && <DemoTag />}
                    </div>
                    <div className="adm-row-title">{item.campaign.title}</div>
                    <div className="adm-row-sub">
                      @{item.creator.displayName} · {item.campaign.code}
                      {item.postUrl &&
                        (demo ? (
                          <> · Post link (demo)</>
                        ) : (
                          <>
                            {" · "}
                            <a href={item.postUrl} target="_blank" rel="noreferrer">
                              Open post ↗
                            </a>
                          </>
                        ))}
                    </div>
                    {item.postVerifications.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                        {item.postVerifications.map((c) => (
                          <StatusBadge key={c.checkType} status={c.result} label={`${humanize(c.checkType)}: ${humanize(c.result)}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="adm-row-side">
                  <Button variant="danger" disabled={demo} loading={actingOn === item.id} onClick={() => decide(item.id, "FAIL")}>
                    Fail
                  </Button>
                  <Button disabled={demo} loading={actingOn === item.id} onClick={() => decide(item.id, "PASS")}>
                    Pass
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
