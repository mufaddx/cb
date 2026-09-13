"use client";

import { useEffect, useState } from "react";
import { PageLoader } from "../../../components/PageLoader";
import { AdminEmpty, AdminIntro, Avatar, DemoBanner, DemoTag, StatusBadge } from "../../../components/admin/AdminUI";
import { SearchIcon, UsersIcon } from "../../../components/icons";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { DEMO_CREATORS, isDemoId, withDemo } from "../../../lib/adminDemo";

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

function riskTone(score: number) {
  return score >= 70 ? "var(--color-danger)" : score >= 40 ? "#b45309" : "var(--color-success)";
}

export default function AdminCreatorsPage() {
  const [creators, setCreators] = useState<CreatorRow[] | null>(null);
  const [q, setQ] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load(query = "") {
    setActiveQuery(query);
    apiFetch<CreatorRow[]>(`/api/admin/creators${query ? `?q=${encodeURIComponent(query)}` : ""}`)
      .then(setCreators)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Failed to load creators.");
        setCreators([]);
      });
  }
  useEffect(() => load(), []);

  const { items, isDemo } = withDemo(creators, DEMO_CREATORS, { allow: !activeQuery && !error });

  return (
    <div className="adm-stack">
      <AdminIntro icon={UsersIcon} tint="purple" meta={items && <span className="adm-chip">{isDemo ? 0 : items.length} creators</span>}>
        Every creator on Vidlix with their Instagram connection, KYC status and performance: quality score, how often they
        finish deals, and a risk score (higher is riskier).
      </AdminIntro>

      <div className="adm-toolbar">
        <div className="adm-search">
          <SearchIcon width={16} height={16} />
          <input
            className="input"
            placeholder="Search by name and press Enter"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(q.trim())}
            aria-label="Search creators"
          />
        </div>
        {activeQuery && (
          <button type="button" className="adm-chip" style={{ cursor: "pointer" }} onClick={() => { setQ(""); load(); }}>
            Clear search “{activeQuery}” ✕
          </button>
        )}
      </div>

      <DemoBanner show={isDemo} />
      {error && <p className="error-text">{error}</p>}

      {!items ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <AdminEmpty icon={UsersIcon} title={activeQuery ? "No creators match your search" : "No creators yet"} text={activeQuery ? "Try a different name." : "Creators appear here as soon as they sign up."} />
      ) : (
        <div className="adm-table-wrap">
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Instagram</th>
                  <th>Availability</th>
                  <th>KYC</th>
                  <th>Quality</th>
                  <th>Completion</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="adm-cell-person">
                        <Avatar name={c.fullName} />
                        <div>
                          <div style={{ fontWeight: 650, display: "flex", alignItems: "center", gap: 8 }}>
                            {c.fullName} {isDemoId(c.id) && <DemoTag />}
                          </div>
                          <div className="helper-text" style={{ marginTop: 1 }}>@{c.displayName}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {c.instagramAccount ? (
                        <div>
                          <div style={{ fontSize: 13.5 }}>@{c.instagramAccount.username}</div>
                          <StatusBadge status={c.instagramAccount.status} />
                        </div>
                      ) : (
                        <StatusBadge status="NOT_CONNECTED" label="Not connected" />
                      )}
                    </td>
                    <td><StatusBadge status={c.availability} /></td>
                    <td><StatusBadge status={c.kycStatus} /></td>
                    <td style={{ fontWeight: 650 }}>{c.qualityScore}</td>
                    <td style={{ fontWeight: 650 }}>{c.completionRate}%</td>
                    <td style={{ fontWeight: 700, color: riskTone(Number(c.riskScore)) }}>{c.riskScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
