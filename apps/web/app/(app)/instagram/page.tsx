"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  return (
    <Suspense>
      <InstagramDashboard />
    </Suspense>
  );
}

function InstagramDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justConnected, setJustConnected] = useState(false);

  function load() {
    apiFetch<InstagramStatus>("/api/instagram")
      .then(setStatus)
      .catch(() => setStatus({ status: "NOT_CONNECTED" }));
  }
  useEffect(load, []);

  // The OAuth callback lands back here with ?connected=1 on success —
  // show the confirmation once, then strip the param so a refresh
  // doesn't re-show it.
  useEffect(() => {
    if (searchParams.get("connected") === "1") {
      setJustConnected(true);
      router.replace("/instagram");
    }
  }, [searchParams, router]);

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
    // NEEDS_RECONNECTION/SYNC_FAILED land here too — same "Connect"
    // action reconnects (the backend upserts the same account row),
    // just worded to match "you were connected, now you're not."
    const wasConnectedBefore = status.status !== "NOT_CONNECTED";
    return (
      <main style={{ padding: 32 }}>
        <div className="card" style={{ maxWidth: 480, padding: 28, textAlign: "center" }}>
          <h3 style={{ marginBottom: 8 }}>{wasConnectedBefore ? "Reconnect Instagram" : "Connect Instagram"}</h3>
          <p className="helper-text" style={{ marginBottom: 20 }}>
            {wasConnectedBefore
              ? "Your Instagram is disconnected — reconnect so brands see current data again."
              : "Brands filter and match campaigns by follower count and reach — connect your account so that data is real and up to date."}
          </p>
          {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}
          <Button onClick={handleConnect} loading={connecting}>{wasConnectedBefore ? "Reconnect Instagram" : "Connect Instagram"}</Button>
        </div>
      </main>
    );
  }

  const m = status.latestMetrics;
  const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-IN"));

  return (
    <main style={{ padding: 32 }}>
      {justConnected && (
        <div
          className="card"
          style={{ padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-success-soft)" }}
        >
          <span style={{ fontWeight: 600, fontSize: 14 }}>✓ Instagram connected successfully.</span>
          <button
            onClick={() => setJustConnected(false)}
            aria-label="Dismiss"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--color-text-secondary)" }}
          >
            ×
          </button>
        </div>
      )}

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

        {/* Connect/disconnect/reconnect all live in this one spot, right
            under the profile they act on — not scattered further down
            the page next to unrelated stats. */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <span className="badge badge-success">Connected</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" onClick={handleRefresh} loading={refreshing}>Refresh</Button>
            <Button variant="danger" onClick={handleDisconnect} loading={disconnecting}>Disconnect</Button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <Stat label="Followers" value={fmt(m?.followers)} />
        <Stat label="Avg. reach" value={fmt(m?.avgReach)} />
        <Stat label="Avg. views" value={fmt(m?.avgViews)} />
        <Stat label="Engagement rate" value={status.engagementRatePct != null ? `${status.engagementRatePct}%` : "—"} />
      </div>

      <span className="helper-text">
        {status.lastSyncedAt ? `Last synced ${new Date(status.lastSyncedAt).toLocaleString()}` : "Not synced yet"}
      </span>
      {error && <p className="error-text" style={{ marginTop: 12 }}>{error}</p>}
    </main>
  );
}
