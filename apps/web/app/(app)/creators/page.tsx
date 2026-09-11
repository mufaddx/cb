"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

interface TopCreator {
  id: string;
  displayName: string;
  bio: string | null;
  location: string | null;
  qualityScore: string;
  completionRate: string;
  categories: string[];
  instagramUsername: string | null;
  followers: number | null;
  avgReach: number | null;
}

export default function TopCreatorsPage() {
  const [creators, setCreators] = useState<TopCreator[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<TopCreator[]>("/api/creators/top")
      .then(setCreators)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load creators."));
  }, []);

  if (error) return <main style={{ padding: 32 }}><p className="error-text">{error}</p></main>;

  return (
    <main style={{ padding: "32px" }}>
      <p className="helper-text" style={{ marginBottom: 20 }}>
        Ranked by quality score and completion rate — the same ordering used to decide who gets offered a campaign
        first when more creators are eligible than a range's quantity.
      </p>

      {!creators ? (
        <p className="helper-text">Loading…</p>
      ) : creators.length === 0 ? (
        <p className="helper-text">No available creators yet.</p>
      ) : (
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "8px 12px" }}>Creator</th>
                <th style={{ padding: "8px 12px" }}>Categories</th>
                <th style={{ padding: "8px 12px" }}>Followers</th>
                <th style={{ padding: "8px 12px" }}>Avg. reach</th>
                <th style={{ padding: "8px 12px" }}>Quality</th>
                <th style={{ padding: "8px 12px" }}>Completion</th>
              </tr>
            </thead>
            <tbody>
              {creators.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "8px 12px" }}>
                    <div style={{ fontWeight: 600 }}>{c.displayName}</div>
                    {c.instagramUsername && <div className="helper-text">@{c.instagramUsername}</div>}
                  </td>
                  <td style={{ padding: "8px 12px" }}>{c.categories.length ? c.categories.join(", ") : "—"}</td>
                  <td style={{ padding: "8px 12px" }}>{c.followers != null ? c.followers.toLocaleString("en-IN") : "—"}</td>
                  <td style={{ padding: "8px 12px" }}>{c.avgReach != null ? c.avgReach.toLocaleString("en-IN") : "—"}</td>
                  <td style={{ padding: "8px 12px" }}>{Number(c.qualityScore).toFixed(1)}</td>
                  <td style={{ padding: "8px 12px" }}>{Number(c.completionRate).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
