"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";

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
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  function load() {
    apiFetch<RetentionItem[]>("/api/retention/queue")
      .then(setQueue)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load the queue."));
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

  if (!queue) return <p>Loading…</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Retention</h1>
          <p className="helper-text" style={{ marginBottom: 20 }}>{queue.length} assignment(s) in their retention window</p>
        </div>
        <Button variant="secondary" loading={runningAll} onClick={runDue}>
          Run Due Checks Now
        </Button>
      </div>
      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}
      {lastRun && <p className="helper-text" style={{ marginBottom: 16 }}>{lastRun}</p>}

      {queue.length === 0 ? (
        <div className="card">No assignments currently in retention.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {queue.map((item) => {
            const remaining = daysRemaining(item.retentionRequiredUntil);
            return (
              <div key={item.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{item.campaign.code}</div>
                  <div style={{ fontWeight: 600 }}>{item.campaign.title}</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>@{item.creator.displayName}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, marginBottom: 8, color: remaining <= 0 ? "var(--color-success)" : "var(--color-text-secondary)" }}>
                    {remaining <= 0 ? "Due now" : `${remaining} day(s) remaining`}
                  </div>
                  <Button loading={actingOn === item.id} onClick={() => checkOne(item.id)}>
                    Check Now
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
