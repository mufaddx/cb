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

interface TopContentItem {
  id: string;
  mediaType: string;
  thumbnailUrl: string | null;
  permalink: string;
  timestamp: string;
  views: number | null;
  likes: number;
  comments: number;
}

interface ContentTypeInteractions {
  type: "REELS" | "POSTS";
  count: number;
  likes: number;
  comments: number;
  shares: number;
  saved: number;
}

interface InsightsSummary {
  periodDays: number;
  totalViews: number | null;
  netFollowers: number | null;
  totalInteractions: number | null;
  viewsSeries: Array<{ date: string; value: number }>;
  contentCounts: { reels: number; posts: number };
  topContent: TopContentItem[];
  interactionsByType: ContentTypeInteractions[];
}

const CONTENT_TYPE_LABEL: Record<string, string> = { REELS: "Reels", POSTS: "Posts" };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      <div className="helper-text" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

/** No charting library loaded in this app — a lightweight inline SVG
 * polyline is plenty for a trend line over a month of daily points. */
function Sparkline({ series }: { series: Array<{ date: string; value: number }> }) {
  if (series.length < 2) return null;
  const max = Math.max(...series.map((s) => s.value), 1);
  const points = series
    .map((s, i) => `${(i / (series.length - 1)) * 100},${100 - (s.value / max) * 100}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: 56, display: "block" }}>
      <polyline points={points} fill="none" stroke="var(--color-primary)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
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
  const [insights, setInsights] = useState<InsightsSummary | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [periodDays, setPeriodDays] = useState(30);

  function load() {
    apiFetch<InstagramStatus>("/api/instagram")
      .then(setStatus)
      .catch(() => setStatus({ status: "NOT_CONNECTED" }));
  }
  useEffect(load, []);

  function loadInsights(days: number) {
    setInsightsLoading(true);
    apiFetch<InsightsSummary>(`/api/instagram/insights?days=${days}`)
      .then(setInsights)
      .catch(() => setInsights(null))
      .finally(() => setInsightsLoading(false));
  }
  useEffect(() => {
    if (status?.status === "CONNECTED") loadInsights(periodDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.status, periodDays]);

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
      <main style={{ padding: 32, display: "flex", justifyContent: "center" }}>
        <div className="card" style={{ maxWidth: 480, width: "100%", padding: 28, textAlign: "center", marginTop: "10vh" }}>
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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "32px 0 16px" }}>
        <h3 style={{ margin: 0 }}>Insights</h3>
        <div style={{ display: "flex", gap: 6 }}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setPeriodDays(d)}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-control)",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                background: periodDays === d ? "var(--color-primary)" : "var(--color-bg-subtle)",
                color: periodDays === d ? "#fff" : "var(--color-text)",
              }}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {insightsLoading && !insights ? (
        <p className="helper-text">Loading insights…</p>
      ) : !insights ? (
        <p className="helper-text">Couldn&apos;t load insights right now.</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ padding: "16px 18px" }}>
              <div className="helper-text" style={{ marginBottom: 4 }}>Views ({insights.periodDays}d)</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{fmt(insights.totalViews)}</div>
              <Sparkline series={insights.viewsSeries} />
            </div>
            <Stat label={`Net followers (${insights.periodDays}d)`} value={insights.netFollowers != null ? (insights.netFollowers >= 0 ? `+${insights.netFollowers}` : String(insights.netFollowers)) : "—"} />
            <Stat label={`Total interactions (${insights.periodDays}d)`} value={fmt(insights.totalInteractions)} />
            <Stat label="Reels / Posts" value={`${insights.contentCounts.reels} / ${insights.contentCounts.posts}`} />
          </div>

          {insights.topContent.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0, fontSize: 15 }}>Top content by views</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
                {insights.topContent.map((item) => (
                  <a
                    key={item.id}
                    href={item.permalink}
                    target="_blank"
                    rel="noreferrer"
                    style={{ position: "relative", display: "block", borderRadius: "var(--radius-control)", overflow: "hidden", aspectRatio: "1 / 1", background: "var(--color-bg-subtle)" }}
                  >
                    {item.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                    <span style={{ position: "absolute", bottom: 6, left: 6, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 4 }}>
                      {fmt(item.views)}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Interactions by content type</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {insights.interactionsByType.map((t) => (
                <div key={t.type}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{CONTENT_TYPE_LABEL[t.type]} ({t.count})</span>
                    <span className="helper-text">
                      {t.likes.toLocaleString()} likes · {t.comments.toLocaleString()} comments · {t.shares.toLocaleString()} shares · {t.saved.toLocaleString()} saved
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="helper-text" style={{ marginTop: 12, marginBottom: 0 }}>
              Stories aren&apos;t included — Instagram&apos;s API only exposes currently-active stories, not historical ones, for any app.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
