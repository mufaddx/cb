"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { SparkIcon } from "@/components/icons";

// Stands in for Meta's real OAuth consent screen while
// INSTAGRAM_PROVIDER=mock (MockInstagramProvider.getAuthorizationUrl
// points here — see apps/api/src/services/instagram). Never reachable
// once a real Meta app is configured, since the real provider returns
// an actual instagram.com authorization URL instead. "Allow" produces
// a fake but real-shaped code and completes the same redirect a live
// Meta consent screen would.
export default function InstagramMockConsentPage() {
  return (
    <Suspense>
      <MockConsent />
    </Suspense>
  );
}

function MockConsent() {
  const router = useRouter();
  const params = useSearchParams();
  const state = params.get("state") ?? "";
  const [loading, setLoading] = useState(false);

  function allow() {
    setLoading(true);
    const code = `mock_${Math.random().toString(36).slice(2, 10)}`;
    router.push(`/creator/instagram/callback?code=${code}&state=${encodeURIComponent(state)}`);
  }

  function deny() {
    router.push("/creator/instagram/callback?error=access_denied");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        padding: 24,
      }}
    >
      <div className="card" style={{ maxWidth: 400, width: "100%", padding: 32, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 11,
              background: "var(--gradient-brand)",
            }}
          >
            <SparkIcon width={20} height={20} stroke="#fff" />
          </span>
        </div>
        <p className="badge" style={{ marginBottom: 12 }}>Development mode — mock Instagram consent</p>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Vidlix wants to access your Instagram account</h1>
        <p className="helper-text" style={{ marginBottom: 24 }}>
          This will let Vidlix see your profile, follower count, and reach — never your login details. This screen
          stands in for Instagram's real consent screen until a live Meta app is configured.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Button variant="secondary" onClick={deny} disabled={loading}>
            Deny
          </Button>
          <Button onClick={allow} loading={loading}>
            Allow
          </Button>
        </div>
      </div>
    </main>
  );
}
