"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

export default function InstagramCallbackPage() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}

function Callback() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const deniedOrFailed = params.get("error");

    if (deniedOrFailed) {
      setError("Instagram connection was cancelled.");
      return;
    }
    if (!code) {
      setError("No authorization code was returned. Please try connecting again.");
      return;
    }

    apiFetch("/api/instagram/connect", { method: "POST", body: { code } })
      // Land back on the Instagram page itself (not the dashboard) so
      // the "connected successfully" moment shows up where the
      // connection actually lives, right next to the profile it just
      // pulled in.
      .then(() => router.replace("/instagram?connected=1"))
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Could not connect Instagram."));
    // Runs once on mount with whatever code/state the redirect arrived with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="container" style={{ maxWidth: 420, padding: "64px 24px", textAlign: "center" }}>
      {error ? (
        <>
          <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>
          <Link href="/dashboard" style={{ fontWeight: 600 }}>Back to dashboard</Link>
        </>
      ) : (
        <p className="helper-text">Connecting your Instagram account…</p>
      )}
    </main>
  );
}
