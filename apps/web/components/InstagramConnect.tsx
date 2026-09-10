"use client";

import { useEffect, useState } from "react";
import { Button } from "./Button";
import { apiFetch, ApiClientError } from "../lib/apiClient";

interface InstagramMetrics {
  followers: number;
  avgReach: number;
  avgViews: number;
}

interface InstagramStatus {
  status: "NOT_CONNECTED" | "CONNECTED" | "EXPIRED" | "REVOKED";
  username?: string;
  connectedAt?: string;
  latestMetrics?: InstagramMetrics | null;
}

/**
 * Real connect flow, not a placeholder: fetches the current
 * connection status, and on "Connect" gets a real authorization URL
 * from the backend and navigates the browser there. In mock mode
 * (INSTAGRAM_PROVIDER=mock) that URL points at /dev/instagram-mock-consent,
 * which simulates the OAuth consent screen and redirects back to
 * META_REDIRECT_URI with a real code — the same round trip a live
 * Meta app would produce.
 */
export function InstagramConnect() {
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<InstagramStatus>("/api/instagram")
      .then(setStatus)
      .catch(() => setStatus({ status: "NOT_CONNECTED" }));
  }, []);

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

  if (!status) return null;

  const connected = status.status === "CONNECTED";

  return (
    <div className="card" style={{ maxWidth: 360, flex: "1 1 280px" }}>
      <h3>Instagram</h3>
      {connected ? (
        <>
          <p style={{ margin: "4px 0 8px", fontWeight: 600 }}>@{status.username}</p>
          {status.latestMetrics && (
            <p style={{ margin: "0 0 10px", color: "var(--color-text-secondary)", fontSize: 13 }}>
              {status.latestMetrics.followers.toLocaleString()} followers · {status.latestMetrics.avgReach.toLocaleString()} avg reach
            </p>
          )}
          <span className="badge badge-success">Connected</span>
        </>
      ) : (
        <>
          <p className="helper-text" style={{ marginBottom: 12 }}>
            Connect your Instagram to start receiving campaign offers.
          </p>
          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
          <Button onClick={handleConnect} loading={connecting}>
            Connect Instagram
          </Button>
        </>
      )}
    </div>
  );
}
