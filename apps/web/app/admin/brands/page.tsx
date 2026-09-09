"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";

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
  const [error, setError] = useState<string | null>(null);

  function load(query?: string) {
    apiFetch<BrandRow[]>(`/api/admin/brands${query ? `?q=${encodeURIComponent(query)}` : ""}`)
      .then(setBrands)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load brands."));
  }
  useEffect(() => load(), []);

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Brands</h1>
      <p className="helper-text" style={{ marginBottom: 20 }}>{brands?.length ?? "…"} shown</p>
      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      <input
        className="input"
        placeholder="Search by company name…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && load(q)}
        style={{ marginBottom: 16, maxWidth: 320 }}
      />

      {!brands ? (
        <p>Loading…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {brands.map((b) => (
            <div key={b.id} className="card" style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{b.companyName}</div>
                <div className="helper-text">{b.contactPerson} {b.industry && `· ${b.industry}`}</div>
              </div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", textAlign: "right" }}>
                {b._count.campaigns} campaign(s) · {b._count.products} product(s)
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
