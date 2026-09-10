"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { apiFetch, ApiClientError, uploadFile } from "@/lib/apiClient";

type CampaignType = "CLIPPING" | "CREATOR_CONTENT" | "PRODUCT_REVIEW";

interface Slab {
  minValue: string;
  maxValue: string;
  payoutAmount: string;
  quantity: string;
}

interface Product {
  id: string;
  name: string;
}

const TYPE_INFO: Record<CampaignType, { title: string; description: string }> = {
  CLIPPING: { title: "Clipping", description: "Creators re-cut and post brand-supplied video." },
  CREATOR_CONTENT: { title: "Creator Content", description: "Creators produce original content to a brief." },
  PRODUCT_REVIEW: { title: "Product Review", description: "Ship a product; creators review it on receipt." },
};

export default function CreateCampaignPage() {
  const router = useRouter();
  const [type, setType] = useState<CampaignType>("CLIPPING");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [retentionDays, setRetentionDays] = useState("30");
  const [disclosureRequired, setDisclosureRequired] = useState(true);
  const [productId, setProductId] = useState("");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [slabs, setSlabs] = useState<Slab[]>([{ minValue: "10000", maxValue: "50000", payoutAmount: "800", quantity: "1" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceAssetKey, setSourceAssetKey] = useState<string | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState(false);

  async function pickSourceAsset(file: File | undefined) {
    if (!file) return;
    setUploadingAsset(true);
    setError(null);
    try {
      const { key } = await uploadFile(file, "campaign-asset");
      setSourceAssetKey(key);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Video upload failed.");
    } finally {
      setUploadingAsset(false);
    }
  }

  useEffect(() => {
    if (type === "PRODUCT_REVIEW") {
      apiFetch<Product[]>("/api/products").then(setProducts).catch(() => setProducts([]));
    }
  }, [type]);

  function updateSlab(i: number, field: keyof Slab, value: string) {
    setSlabs((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }
  function addSlab() {
    setSlabs((prev) => [...prev, { minValue: "", maxValue: "", payoutAmount: "", quantity: "1" }]);
  }
  function removeSlab(i: number) {
    setSlabs((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (type === "PRODUCT_REVIEW" && !productId) {
      setError("Select a product for this Product Review campaign.");
      return;
    }
    if (type === "CLIPPING" && !sourceAssetKey) {
      setError("Upload the source video creators will clip and post.");
      return;
    }

    setLoading(true);
    try {
      const campaign = await apiFetch<{ id: string }>("/api/campaigns", {
        method: "POST",
        body: {
          type,
          title,
          description,
          targetingMetric: "FOLLOWER_COUNT",
          retentionDays: Number(retentionDays),
          disclosureRequired,
          productId: type === "PRODUCT_REVIEW" ? productId : undefined,
          briefJson: type === "CLIPPING" ? { sourceAssetKey } : undefined,
          targetingSlabs: slabs.map((s) => ({
            minValue: Number(s.minValue),
            maxValue: s.maxValue ? Number(s.maxValue) : null,
            payoutAmount: Number(s.payoutAmount),
            quantity: Number(s.quantity),
          })),
        },
      });
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main style={{ padding: "32px" }}>
        <h1>Create Campaign</h1>
        <p className="helper-text" style={{ marginBottom: 24, maxWidth: 640 }}>
          A simplified single-page version of the full campaign wizard, though everything it submits is real.
          Pricing is computed from the live rate card, and admin review, payment, and creator matching all follow
          from here.
        </p>

        <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
          <label className="label">Campaign Type</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
            {(Object.keys(TYPE_INFO) as CampaignType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className="card"
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  background: type === t ? "var(--color-primary-soft)" : "var(--color-bg-subtle)",
                }}
              >
                <strong style={{ fontSize: 14 }}>{TYPE_INFO[t].title}</strong>
                <div className="helper-text">{TYPE_INFO[t].description}</div>
              </button>
            ))}
          </div>

          <label className="label">Title</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 16 }} />

          <label className="label">Description</label>
          <textarea
            className="input"
            required
            minLength={10}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ marginBottom: 16, minHeight: 90, resize: "vertical", fontFamily: "inherit" }}
          />

          {type === "CLIPPING" && (
            <>
              <label className="label">Source video</label>
              <p className="helper-text" style={{ marginBottom: 8 }}>
                The raw footage creators will re-cut and post. Required before you can save this campaign.
              </p>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => pickSourceAsset(e.target.files?.[0])}
                style={{ marginBottom: 4, fontSize: 13 }}
              />
              {uploadingAsset && <p className="helper-text">Uploading…</p>}
              {sourceAssetKey && !uploadingAsset && <p className="helper-text">Uploaded — ready to save.</p>}
              <div style={{ marginBottom: 16 }} />
            </>
          )}

          {type === "PRODUCT_REVIEW" && (
            <>
              <label className="label">Product</label>
              <select
                className="input"
                required
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                style={{ marginBottom: 16 }}
              >
                <option value="">Select a product…</option>
                {products?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {products?.length === 0 && (
                <p className="helper-text" style={{ marginTop: -12, marginBottom: 16 }}>
                  No products yet — add one on the Products page first.
                </p>
              )}
            </>
          )}

          <label className="label">Follower-count targeting slabs</label>
          <p className="helper-text" style={{ marginBottom: 8 }}>
            Payout must be at or above the platform&apos;s rate card for that range, or pricing will be rejected.
          </p>
          {slabs.map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 80px auto", gap: 8, marginBottom: 8 }}>
              <input className="input" type="number" placeholder="Min followers" value={s.minValue} onChange={(e) => updateSlab(i, "minValue", e.target.value)} />
              <input className="input" type="number" placeholder="Max (blank = ∞)" value={s.maxValue} onChange={(e) => updateSlab(i, "maxValue", e.target.value)} />
              <input className="input" type="number" placeholder="Payout ₹" value={s.payoutAmount} onChange={(e) => updateSlab(i, "payoutAmount", e.target.value)} />
              <input className="input" type="number" placeholder="Qty" value={s.quantity} onChange={(e) => updateSlab(i, "quantity", e.target.value)} />
              {slabs.length > 1 && (
                <Button type="button" variant="secondary" onClick={() => removeSlab(i)}>×</Button>
              )}
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={addSlab} style={{ marginBottom: 20 }}>
            + Add Another Range
          </Button>

          <label className="label">Retention (days)</label>
          <input
            className="input"
            type="number"
            min={0}
            value={retentionDays}
            onChange={(e) => setRetentionDays(e.target.value)}
            style={{ marginBottom: 16, maxWidth: 160 }}
          />

          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 24, fontSize: 14 }}>
            <input type="checkbox" checked={disclosureRequired} onChange={(e) => setDisclosureRequired(e.target.checked)} />
            Require a sponsored post disclosure
          </label>

          {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

          <Button type="submit" loading={loading}>Save Draft</Button>
        </form>
      </main>
    </>
  );
}
