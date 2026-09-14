"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../../../components/Button";
import { PageLoader } from "../../../components/PageLoader";
import { AdminEmpty, AdminIntro, Avatar, DemoBanner, DemoTag, StatusBadge, formatDate } from "../../../components/admin/AdminUI";
import { ClockIcon } from "../../../components/icons";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { DEMO_RETENTION, isDemoId, withDemo } from "../../../lib/adminDemo";

interface RetentionItem {
  id: string;
  retentionRequiredUntil: string | null;
  campaign: { title: string; code: string; retentionDays: number };
  creator: { displayName: string };
}

function daysRemaining(until: string | null): number {
  if (!until) return 0;
  return Math.ceil((new Date(until).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function RetentionQueuePage() {
  const [queue, setQueue] = useState<RetentionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  function load() {
    apiFetch<RetentionItem[]>("/api/retention/queue")
      .then(setQueue)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Failed to load the queue.");
        setLoadError(true);
        setQueue([]);
      });
  }
  useEffect(load, []);

  async function checkOne(id: string) {
    setActingOn(id);
    setError(null);
    try {
      const result = await apiFetch<{ outcome: string }>(`/api/retention/${id}/check`, { method: "POST" });
      setLastRun(`Checked: ${result.outcome}`);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  async function runDue() {
    setRunningAll(true);
    setError(null);
    try {
      const result = await apiFetch<unknown[]>("/api/retention/run-due", { method: "POST" });
      setLastRun(`Ran ${result.length} due check(s).`);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setRunningAll(false);
    }
  }

  const { items, isDemo } = withDemo(queue, DEMO_RETENTION, { allow: !loadError });
  if (!items) return <PageLoader />;

  return (
    <div className="adm-stack">
      <AdminIntro
        icon={ClockIcon}
        tint="amber"
        meta={
          <Button variant="secondary" loading={runningAll} onClick={runDue}>
            Run due checks now
          </Button>
        }
      >
        Some campaigns require a post to stay live for a set number of days before the creator is paid. Checks run
        automatically; you can also check one now or run every check that is due.
      </AdminIntro>
      <DemoBanner show={isDemo} />
      {error && <p className="error-text">{error}</p>}
      {lastRun && <p className="helper-text" style={{ margin: 0 }}>{lastRun}</p>}

      {items.length === 0 ? (
        <AdminEmpty icon={ClockIcon} title="No posts currently in retention" text="Approved posts that must stay live before payout appear here until their period ends." />
      ) : (
        <div className="adm-list">
          {items.map((item) => {
            const demo = isDemoId(item.id);
            const remaining = daysRemaining(item.retentionRequiredUntil);
            return (
              <div key={item.id} className={`adm-row${demo ? " is-demo" : ""}`}>
                <div className="adm-row-main">
                  <Avatar name={item.creator.displayName} />
                  <div style={{ minWidth: 0 }}>
                    <div className="adm-row-meta">
                      {remaining <= 0 ? (
                        <StatusBadge status="COMPLETED" label="Due now" />
                      ) : (
                        <StatusBadge status="IN_PROGRESS" label={`${remaining} day${remaining === 1 ? "" : "s"} left`} />
                      )}
                      <span className="adm-chip">{item.campaign.retentionDays}-day retention</span>
                      {demo && <DemoTag />}
                    </div>
                    <div className="adm-row-title">{item.campaign.title}</div>
                    <div className="adm-row-sub">
                      @{item.creator.displayName} · {item.campaign.code} · Must stay live until {formatDate(item.retentionRequiredUntil)}
                    </div>
                  </div>
                </div>
                <div className="adm-row-side">
                  {!demo && <Link href={`/admin/assignments/${item.id}`} className="adm-view-link">View →</Link>}
                  <Button disabled={demo} loading={actingOn === item.id} onClick={() => checkOne(item.id)}>
                    Check now
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
