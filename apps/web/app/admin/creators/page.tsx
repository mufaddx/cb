"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";

interface CreatorRow {
  id: string;
  fullName: string;
  displayName: string;
  availability: string;
  kycStatus: string;
  qualityScore: string;
  completionRate: string;
  riskScore: string;
  instagramAccount: { username: string; status: string } | null;
}

export default function AdminCreatorsPage() {
  const [creators, setCreators] = useState<CreatorRow[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load(query?: string) {
    apiFetch<CreatorRow[]>(`/api/admin/creators${query ? `?q=${encodeURIComponent(query)}` : ""}`)
      .then(setCreators)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load creators."));
  }
  useEffect(() => load(), []);

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Creators</h1>
      <p className="helper-text" style={{ marginBottom: 20 }}>{creators?.length ?? "…"} shown</p>
      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      <input
        className="input"
        placeholder="Search by name…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && load(q)}
        style={{ marginBottom: 16, maxWidth: 320 }}
      />

      {!creators ? (
        <p>Loading…</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "8px 12px" }}>Name</th>
                <th style={{ padding: "8px 12px" }}>Instagram</th>
                <th style={{ padding: "8px 12px" }}>Availability</th>
                <th style={{ padding: "8px 12px" }}>KYC</th>
                <th style={{ padding: "8px 12px" }}>Quality</th>
                <th style={{ padding: "8px 12px" }}>Completion</th>
                <th style={{ padding: "8px 12px" }}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {creators.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "8px 12px" }}>{c.fullName}<div className="helper-text">@{c.displayName}</div></td>
                  <td style={{ padding: "8px 12px" }}>
                    {c.instagramAccount ? `@${c.instagramAccount.username} (${c.instagramAccount.status})` : "Not connected"}
                  </td>
                  <td style={{ padding: "8px 12px" }}>{c.availability}</td>
                  <td style={{ padding: "8px 12px" }}>{c.kycStatus}</td>
                  <td style={{ padding: "8px 12px" }}>{c.qualityScore}</td>
                  <td style={{ padding: "8px 12px" }}>{c.completionRate}%</td>
                  <td style={{ padding: "8px 12px" }}>{c.riskScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
