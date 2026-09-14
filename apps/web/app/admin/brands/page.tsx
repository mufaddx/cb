"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageLoader } from "../../../components/PageLoader";
import { AdminEmpty, AdminIntro, Avatar, DemoBanner, DemoTag, formatDate } from "../../../components/admin/AdminUI";
import { BuildingIcon, SearchIcon } from "../../../components/icons";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { DEMO_BRANDS, isDemoId, withDemo } from "../../../lib/adminDemo";

interface BrandRow {
  id: string;
  companyName: string;
  contactPerson: string;
  industry: string | null;
  createdAt: string;
  _count: { campaigns: number; products: number };
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<BrandRow[] | null>(null);
  const [q, setQ] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load(query = "") {
    setActiveQuery(query);
    apiFetch<BrandRow[]>(`/api/admin/brands${query ? `?q=${encodeURIComponent(query)}` : ""}`)
      .then(setBrands)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Failed to load brands.");
        setBrands([]);
      });
  }
  useEffect(() => load(), []);

  // Sample rows only for a genuinely empty list — never for a search that found nothing.
  const { items, isDemo } = withDemo(brands, DEMO_BRANDS, { allow: !activeQuery && !error });

  return (
    <div className="adm-stack">
      <AdminIntro icon={BuildingIcon} tint="blue" meta={items && <span className="adm-chip">{isDemo ? 0 : items.length} brands</span>}>
        Every brand registered on Vidlix: who runs the account, their industry, and how many campaigns and products they have.
      </AdminIntro>

      <div className="adm-toolbar">
        <div className="adm-search">
          <SearchIcon width={16} height={16} />
          <input
            className="input"
            placeholder="Search by company name and press Enter"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(q.trim())}
            aria-label="Search brands"
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
        <AdminEmpty icon={BuildingIcon} title={activeQuery ? "No brands match your search" : "No brands yet"} text={activeQuery ? "Try a different company name." : "Brands appear here as soon as they sign up."} />
      ) : (
        <div className="adm-table-wrap">
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Industry</th>
                  <th>Campaigns</th>
                  <th>Products</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className="adm-cell-person">
                        <Avatar name={b.companyName} square />
                        <div>
                          <div style={{ fontWeight: 650, display: "flex", alignItems: "center", gap: 8 }}>
                            {b.companyName} {isDemoId(b.id) && <DemoTag />}
                          </div>
                          <div className="helper-text" style={{ marginTop: 1 }}>Contact: {b.contactPerson}</div>
                        </div>
                      </div>
                    </td>
                    <td>{b.industry ?? "—"}</td>
                    <td style={{ fontWeight: 650 }}>{b._count.campaigns}</td>
                    <td style={{ fontWeight: 650 }}>{b._count.products}</td>
                    <td className="helper-text" style={{ whiteSpace: "nowrap" }}>{formatDate(b.createdAt)}</td>
                    <td>
                      {isDemoId(b.id) ? (
                        <span className="helper-text">—</span>
                      ) : (
                        <Link href={`/admin/brands/${b.id}`} className="adm-view-link">View →</Link>
                      )}
                    </td>
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
