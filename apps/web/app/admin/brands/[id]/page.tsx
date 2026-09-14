"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageLoader } from "../../../../components/PageLoader";
import { AdminIntro, Avatar, BackLink, Field, FieldList, StatusBadge, formatDate, formatINR, humanize } from "../../../../components/admin/AdminUI";
import { BuildingIcon, MegaphoneIcon } from "../../../../components/icons";
import { apiFetch, ApiClientError } from "../../../../lib/apiClient";

interface BrandCampaign {
  id: string;
  code: string;
  title: string;
  type: string;
  status: string;
}
interface BrandWallet {
  availableBalance: string;
  reservedBalance: string;
}
interface BrandDetail {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string | null;
  website: string | null;
  industry: string | null;
  billingAddress: string | null;
  gstin: string | null;
  description: string | null;
  onboardingComplete: boolean;
  profileViewCredits: number;
  createdAt: string;
  campaigns: BrandCampaign[];
  wallet: BrandWallet | null;
  categories: Array<{ category: { name: string } }>;
}

export default function AdminBrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [brand, setBrand] = useState<BrandDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<BrandDetail>(`/api/admin/brands/${id}`)
      .then(setBrand)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load this brand."));
  }, [id]);

  if (error) {
    return (
      <div className="adm-stack">
        <BackLink href="/admin/brands">Back to brands</BackLink>
        <p className="error-text">{error}</p>
      </div>
    );
  }
  if (!brand) return <PageLoader />;

  return (
    <div className="adm-stack">
      <BackLink href="/admin/brands">Back to brands</BackLink>

      <div className="adm-detail-head">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={brand.companyName} square />
          <div>
            <h1>{brand.companyName}</h1>
            <div className="adm-detail-sub">
              <span>{brand.contactPerson}</span>
              <span>·</span>
              <span>Joined {formatDate(brand.createdAt)}</span>
              <StatusBadge status={brand.onboardingComplete ? "ACTIVE" : "PENDING"} label={brand.onboardingComplete ? "Onboarded" : "Onboarding incomplete"} />
            </div>
          </div>
        </div>
      </div>

      <div className="adm-detail-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="adm-panel" style={{ padding: 20 }}>
            <FieldList>
              <Field label="Industry" value={brand.industry ?? "—"} />
              <Field label="Phone" value={brand.phone ?? "—"} />
              <Field label="Website" value={brand.website ?? "—"} />
              <Field label="GSTIN" value={brand.gstin ?? "—"} />
              <Field label="Billing address" value={brand.billingAddress ?? "—"} full />
              <Field label="Categories" value={brand.categories.length ? brand.categories.map((c) => c.category.name).join(", ") : "—"} full />
              {brand.description && <Field label="About" value={brand.description} full />}
            </FieldList>
          </div>

          <div className="adm-panel">
            <div className="adm-panel-head">
              <h3>Campaigns ({brand.campaigns.length})</h3>
              <Link href="/admin/campaigns">Go to Campaign Reviews →</Link>
            </div>
            {brand.campaigns.length === 0 ? (
              <p className="adm-panel-empty">This brand hasn&apos;t created a campaign yet.</p>
            ) : (
              brand.campaigns.map((c) => (
                <div key={c.id} className="adm-panel-row">
                  <span className="icon-badge icon-badge-purple" aria-hidden="true">
                    <MegaphoneIcon width={15} height={15} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 650, fontSize: 13.5 }}>{c.title}</div>
                    <div className="helper-text" style={{ marginTop: 1 }}>
                      {c.code} · {humanize(c.type)}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="adm-panel" style={{ padding: 18 }}>
            <div className="adm-field-label">Wallet balance</div>
            <div style={{ fontSize: 24, fontWeight: 750, marginTop: 4 }}>{formatINR(brand.wallet?.availableBalance ?? 0)}</div>
            {Number(brand.wallet?.reservedBalance ?? 0) > 0 && (
              <div className="helper-text" style={{ marginTop: 2 }}>{formatINR(brand.wallet!.reservedBalance)} reserved</div>
            )}
          </div>
          <div className="adm-panel" style={{ padding: 18 }}>
            <div className="adm-field-label">Profile-view credits</div>
            <div style={{ fontSize: 24, fontWeight: 750, marginTop: 4 }}>{brand.profileViewCredits}</div>
            <div className="helper-text" style={{ marginTop: 2 }}>Used to unlock a creator&apos;s name and Instagram handle.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
