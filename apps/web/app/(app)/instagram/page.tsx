"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { useConfirm } from "@/lib/useConfirm";

interface InstagramMetrics {
  followers: number;
  avgReach: number | null;
  avgViews: number | null;
  capturedAt: string;
}

interface InstagramStatus {
  status: "NOT_CONNECTED" | "CONNECTED" | "NEEDS_RECONNECTION" | "SYNC_FAILED";
  username?: string;
  fullName?: string | null;
  bio?: string | null;
  profilePictureUrl?: string | null;
  connectedAt?: string;
  lastSyncedAt?: string | null;
  latestMetrics?: InstagramMetrics | null;
  engagementRatePct?: number | null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      <div className="helper-text" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export default function InstagramDashboardPage() {
  const confirm = useConfirm();
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiFetch<InstagramStatus>("/api/instagram")
      .then(setStatus)
      .catch(() => setStatus({ status: "NOT_CONNECTED" }));
  }
  useEffect(load, []);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const { url } = await apiFetch<{ url: string }>("/api/instagram/authorize-url");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not start the Instagram connection.");
      setConnecting(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const updated = await apiFetch<InstagramStatus>("/api/instagram/refresh", { method: "POST" });
      setStatus(updated);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't refresh right now.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDisconnect() {
    const confirmed = await confirm({
      title: "Disconnect Instagram?",
      description: "Brands won't be able to see updated follower/reach data until you reconnect.",
      danger: true,
      confirmLabel: "Disconnect",
    });
    if (!confirmed) return;
    setDisconnecting(true);
    setError(null);
    try {
      const updated = await apiFetch<InstagramStatus>("/api/instagram/disconnect", { method: "POST" });
      setStatus(updated);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't disconnect right now.");
    } finally {
      setDisconnecting(false);
    }
  }

  if (!status) {
    return <main style={{ padding: 32 }}><p className="helper-text">Loading…</p></main>;
  }

  if (status.status !== "CONNECTED") {
    return (
      <main style={{ padding: 32 }}>
        <div className="card" style={{ maxWidth: 480, padding: 28, textAlign: "center" }}>
          <h3 style={{ marginBottom: 8 }}>Connect Instagram</h3>
          <p className="helper-text" style={{ marginBottom: 20 }}>
            Brands filter and match campaigns by follower count and reach — connect your account so that data is
            real and up to date.
          </p>
          {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}
          <Button onClick={handleConnect} loading={connecting}>Connect Instagram</Button>
        </div>
      </main>
    );
  }

  const m = status.latestMetrics;
  const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-IN"));

  return (
    <main style={{ padding: 32 }}>
      <div className="card" style={{ padding: 24, marginBottom: 20, display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            flexShrink: 0,
            background: status.profilePictureUrl ? undefined : "var(--gradient-brand)",
            backgroundImage: status.profilePictureUrl ? `url(${status.profilePictureUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          {!status.profilePictureUrl && (status.fullName ?? status.username ?? "?").charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{status.fullName ?? status.username}</div>
          <div className="helper-text" style={{ marginBottom: status.bio ? 6 : 0 }}>@{status.username}</div>
          {status.bio && <p style={{ margin: 0, fontSize: 13.5, color: "var(--color-text-secondary)", maxWidth: 480 }}>{status.bio}</p>}
        </div>
        <span className="badge badge-success">Connected</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <Stat label="Followers" value={fmt(m?.followers)} />
        <Stat label="Avg. reach" value={fmt(m?.avgReach)} />
        <Stat label="Avg. views" value={fmt(m?.avgViews)} />
        <Stat label="Engagement rate" value={status.engagementRatePct != null ? `${status.engagementRatePct}%` : "—"} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Button variant="secondary" onClick={handleRefresh} loading={refreshing}>Refresh</Button>
        <Button variant="danger" onClick={handleDisconnect} loading={disconnecting}>Disconnect</Button>
        <span className="helper-text">
          {status.lastSyncedAt ? `Last synced ${new Date(status.lastSyncedAt).toLocaleString()}` : "Not synced yet"}
        </span>
      </div>
      {error && <p className="error-text" style={{ marginTop: 12 }}>{error}</p>}
    </main>
  );
}
