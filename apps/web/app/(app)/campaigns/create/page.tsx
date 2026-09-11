"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { apiFetch, ApiClientError, uploadFile } from "@/lib/apiClient";
import { CheckCircleIcon, TrashIcon, UploadCloudIcon } from "@/components/icons";

// Only two campaign types are ever pickable — Product Review isn't a
// third button, it's a checkbox inside Creator Content ("ship a
// product for creators to review"). The backend still stores that as
// its own CampaignType (PRODUCT_REVIEW) since the shipping/verification
// flow is keyed off it — effectiveType below is what actually gets
// submitted, TYPE stays purely a UI concern.
type UiType = "CLIPPING" | "CREATOR_CONTENT";
type Metric = "FOLLOWER_COUNT" | "AVERAGE_REACH";

const TYPE_INFO: Record<UiType, { title: string; description: string }> = {
  CLIPPING: { title: "Clipping", description: "Creators re-cut and post brand-supplied video." },
  CREATOR_CONTENT: { title: "Creator Content", description: "Creators produce original content to a brief." },
};

interface PricingSlabDto {
  id: string;
  minValue: number;
  maxValue: number | null;
  payoutAmount: string;
  feeAmount: string;
}

interface RangeRow {
  slabId: string;
  payoutAmount: string;
  quantity: string;
}

interface Product {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

function formatRange(min: number, max: number | null, metric: Metric): string {
  const unit = metric === "AVERAGE_REACH" ? "reach" : "followers";
  const fmt = (n: number) => n.toLocaleString("en-IN");
  return max ? `${fmt(min)}–${fmt(max)} ${unit}` : `${fmt(min)}+ ${unit}`;
}

// Every field group below is one of these — a numbered card with a
// title and a one-line explainer, instead of labels floating directly
// on the page background with no sense of where one question ends and
// the next begins.
function Section({ step, title, hint, children }: { step: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 16, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: hint ? 4 : 16 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 7,
            background: "var(--color-primary-soft)",
            color: "var(--color-primary)",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {step}
        </span>
        <h3 style={{ fontSize: 15, margin: 0 }}>{title}</h3>
      </div>
      {hint && <p className="helper-text" style={{ margin: "0 0 16px", paddingLeft: 32 }}>{hint}</p>}
      <div style={{ paddingLeft: 32 }}>{children}</div>
    </div>
  );
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const [type, setType] = useState<UiType>("CLIPPING");
  const [shipsProduct, setShipsProduct] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [retentionDays, setRetentionDays] = useState("30");
  const [disclosureRequired, setDisclosureRequired] = useState(true);
  const [productId, setProductId] = useState("");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceAssetKey, setSourceAssetKey] = useState<string | null>(null);
  const [sourceAssetName, setSourceAssetName] = useState<string | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState(false);

  const [metric, setMetric] = useState<Metric>("FOLLOWER_COUNT");
  const [availableSlabs, setAvailableSlabs] = useState<PricingSlabDto[] | null>(null);
  const [ranges, setRanges] = useState<RangeRow[]>([]);

  // What's actually sent as `type` — Creator Content + "ships a
  // product" is a Product Review campaign under the hood, since
  // that's the type the shipping/content-review flow is keyed off.
  const effectiveType = type === "CREATOR_CONTENT" && shipsProduct ? "PRODUCT_REVIEW" : type;

  async function pickSourceAsset(file: File | undefined) {
    if (!file) return;
    setUploadingAsset(true);
    setError(null);
    try {
      const { key } = await uploadFile(file, "campaign-asset");
      setSourceAssetKey(key);
      setSourceAssetName(file.name);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Video upload failed.");
    } finally {
      setUploadingAsset(false);
    }
  }

  useEffect(() => {
    if (shipsProduct) {
      apiFetch<Product[]>("/api/products").then(setProducts).catch(() => setProducts([]));
    }
  }, [shipsProduct]);

  useEffect(() => {
    apiFetch<Category[]>("/api/categories").then(setCategories).catch(() => setCategories([]));
  }, []);

  // The rate card (and therefore which ranges are even choosable)
  // depends on both the campaign type and the targeting metric — a
  // Clipping/Followers range isn't necessarily the same band as a
  // Creator Content/Reach one. Refetch and reset selected ranges
  // whenever either changes, rather than letting a stale range from a
  // different rate card silently carry over.
  useEffect(() => {
    setAvailableSlabs(null);
    setRanges([]);
    apiFetch<PricingSlabDto[]>(`/api/campaigns/pricing-slabs?type=${effectiveType}&metric=${metric}`)
      .then((slabs) => {
        setAvailableSlabs(slabs);
        if (slabs.length > 0) {
          setRanges([{ slabId: slabs[0].id, payoutAmount: slabs[0].payoutAmount, quantity: "1" }]);
        }
      })
      .catch(() => setAvailableSlabs([]));
  }, [effectiveType, metric]);

  function updateRange(i: number, field: keyof RangeRow, value: string) {
    setRanges((prev) =>
      prev.map((r, idx) => {
        if (idx !== i) return r;
        if (field === "slabId") {
          const slab = availableSlabs?.find((s) => s.id === value);
          return { ...r, slabId: value, payoutAmount: slab?.payoutAmount ?? r.payoutAmount };
        }
        return { ...r, [field]: value };
      })
    );
  }
  function addRange() {
    if (!availableSlabs) return;
    const used = new Set(ranges.map((r) => r.slabId));
    const next = availableSlabs.find((s) => !used.has(s.id));
    if (!next) return;
    setRanges((prev) => [...prev, { slabId: next.id, payoutAmount: next.payoutAmount, quantity: "1" }]);
  }
  function removeRange(i: number) {
    setRanges((prev) => prev.filter((_, idx) => idx !== i));
  }
  function optionsForRow(currentSlabId: string): PricingSlabDto[] {
    if (!availableSlabs) return [];
    const usedByOtherRows = new Set(ranges.filter((r) => r.slabId !== currentSlabId).map((r) => r.slabId));
    return availableSlabs.filter((s) => !usedByOtherRows.has(s.id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (shipsProduct && !productId) {
      setError("Select which product creators will receive.");
      return;
    }
    if (type === "CLIPPING" && !sourceAssetKey) {
      setError("Upload the source video creators will clip and post.");
      return;
    }
    if (ranges.length === 0) {
      setError("Add at least one targeting range.");
      return;
    }

    setLoading(true);
    try {
      const campaign = await apiFetch<{ id: string }>("/api/campaigns", {
        method: "POST",
        body: {
          type: effectiveType,
          title,
          description,
          targetingMetric: metric,
          categoryId: categoryId || undefined,
          retentionDays: Number(retentionDays),
          disclosureRequired,
          productId: shipsProduct ? productId : undefined,
          briefJson: type === "CLIPPING" ? { sourceAssetKey } : undefined,
          targetingSlabs: ranges.map((r) => {
            const slab = availableSlabs!.find((s) => s.id === r.slabId)!;
            return {
              minValue: slab.minValue,
              maxValue: slab.maxValue,
              payoutAmount: Number(r.payoutAmount),
              quantity: Number(r.quantity),
            };
          }),
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
    <main style={{ padding: "32px" }}>
      <p className="helper-text" style={{ marginBottom: 24, maxWidth: 640 }}>
        A simplified single-page version of the full campaign wizard, though everything it submits is real.
        Pricing is computed from the live rate card, and admin review, payment, and creator matching all follow
        from here.
      </p>

      <form onSubmit={handleSubmit} style={{ maxWidth: 680 }}>
        <Section step={1} title="Campaign type">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {(Object.keys(TYPE_INFO) as UiType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  if (t === "CLIPPING") setShipsProduct(false);
                }}
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

          {type === "CREATOR_CONTENT" && (
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14, fontSize: 13.5 }}>
              <input
                type="checkbox"
                checked={shipsProduct}
                onChange={(e) => setShipsProduct(e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0 }}
              />
              <span>Ship a product for this campaign — creators will receive it and review it as their content.</span>
            </label>
          )}
        </Section>

        <Section step={2} title="Campaign details">
          <label className="label">Title</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 16 }} />

          <label className="label">Description</label>
          <textarea
            className="input"
            required
            minLength={10}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ marginBottom: type === "CLIPPING" || shipsProduct ? 16 : 0, minHeight: 90, resize: "vertical", fontFamily: "inherit" }}
          />

          {type === "CLIPPING" && (
            <>
              <label className="label">Source video</label>
              <label
                htmlFor="source-video"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  borderRadius: "var(--radius-control)",
                  cursor: uploadingAsset ? "default" : "pointer",
                  background: sourceAssetKey ? "var(--color-success-soft)" : "var(--color-bg-subtle)",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    flexShrink: 0,
                    background: sourceAssetKey ? "var(--color-success)" : "var(--color-primary-soft)",
                    color: sourceAssetKey ? "#fff" : "var(--color-primary)",
                  }}
                >
                  {sourceAssetKey ? <CheckCircleIcon width={18} height={18} /> : <UploadCloudIcon width={18} height={18} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {uploadingAsset ? "Uploading…" : sourceAssetKey ? sourceAssetName ?? "Video uploaded" : "Choose a video to upload"}
                  </div>
                  <div className="helper-text" style={{ marginTop: 2 }}>
                    {sourceAssetKey
                      ? "Ready to save — click to replace it."
                      : "The raw footage creators will re-cut and post. Required to save this campaign."}
                  </div>
                </span>
                <input
                  id="source-video"
                  type="file"
                  accept="video/*"
                  disabled={uploadingAsset}
                  onChange={(e) => pickSourceAsset(e.target.files?.[0])}
                  style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
                />
              </label>
            </>
          )}

          {shipsProduct && (
            <>
              <label className="label">Product</label>
              <select
                className="input"
                required
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">Select a product…</option>
                {products?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {products?.length === 0 && (
                <p className="helper-text" style={{ marginTop: 8 }}>
                  No products yet — add one on the Products page first.
                </p>
              )}
            </>
          )}
        </Section>

        <Section
          step={3}
          title="Who this reaches"
          hint="Category narrows the pool first; the metric below then filters by audience size within it."
        >
          <label className="label">Category</label>
          <select
            className="input"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{ marginBottom: 20, maxWidth: 340 }}
          >
            <option value="">No category — targeting only</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <label className="label">Target creators by</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 8 }}>
            {(["FOLLOWER_COUNT", "AVERAGE_REACH"] as Metric[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className="card"
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  padding: "12px 14px",
                  background: metric === m ? "var(--color-primary-soft)" : "var(--color-bg-subtle)",
                }}
              >
                <strong style={{ fontSize: 13.5 }}>{m === "FOLLOWER_COUNT" ? "Follower count" : "Average reach"}</strong>
              </button>
            ))}
          </div>
          <p className="helper-text" style={{ margin: 0 }}>
            Only creators matching the metric you pick here are offered this campaign — the other one is ignored entirely.
          </p>
        </Section>

        <Section step={4} title="Ranges &amp; payout" hint="Pick every audience-size band this campaign should offer to, and how many creators you need at each.">
          {availableSlabs === null ? (
            <p className="helper-text">Loading rate card…</p>
          ) : availableSlabs.length === 0 ? (
            <p className="error-text">No active rate card for this combination yet — try the other metric, or contact support.</p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 80px 32px", gap: 8, marginBottom: 6, padding: "0 2px" }}>
                <span className="helper-text" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Range</span>
                <span className="helper-text" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Payout ₹</span>
                <span className="helper-text" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Qty</span>
                <span />
              </div>
              {ranges.map((r, i) => {
                const slab = availableSlabs.find((s) => s.id === r.slabId);
                return (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.4fr 1fr 80px 32px",
                      gap: 8,
                      marginBottom: 8,
                      alignItems: "center",
                      background: "var(--color-bg-subtle)",
                      borderRadius: "var(--radius-control)",
                      padding: "6px",
                    }}
                  >
                    <select className="input" value={r.slabId} onChange={(e) => updateRange(i, "slabId", e.target.value)} style={{ background: "var(--color-white)" }}>
                      {optionsForRow(r.slabId).map((s) => (
                        <option key={s.id} value={s.id}>{formatRange(s.minValue, s.maxValue, metric)}</option>
                      ))}
                    </select>
                    <input
                      className="input"
                      type="number"
                      min={slab ? Number(slab.payoutAmount) : 0}
                      value={r.payoutAmount}
                      onChange={(e) => updateRange(i, "payoutAmount", e.target.value)}
                      style={{ background: "var(--color-white)" }}
                    />
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={r.quantity}
                      onChange={(e) => updateRange(i, "quantity", e.target.value)}
                      style={{ background: "var(--color-white)" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeRange(i)}
                      disabled={ranges.length === 1}
                      aria-label="Remove range"
                      title="Remove range"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 32,
                        height: 32,
                        border: "none",
                        borderRadius: 8,
                        background: "transparent",
                        color: ranges.length === 1 ? "var(--color-text-faint)" : "var(--color-danger)",
                        cursor: ranges.length === 1 ? "not-allowed" : "pointer",
                      }}
                    >
                      <TrashIcon width={15} height={15} />
                    </button>
                  </div>
                );
              })}
              <p className="helper-text" style={{ margin: "8px 0 16px" }}>
                Payout can be raised above the platform floor shown, never lowered below it.
              </p>
              {ranges.length < availableSlabs.length && (
                <Button type="button" variant="secondary" onClick={addRange}>
                  + Add Another Range
                </Button>
              )}
            </>
          )}
        </Section>

        <Section step={5} title="Delivery settings">
          <label className="label">Retention (days)</label>
          <input
            className="input"
            type="number"
            min={0}
            value={retentionDays}
            onChange={(e) => setRetentionDays(e.target.value)}
            style={{ marginBottom: 16, maxWidth: 160 }}
          />

          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13.5 }}>
            <input type="checkbox" checked={disclosureRequired} onChange={(e) => setDisclosureRequired(e.target.checked)} />
            Require a sponsored post disclosure
          </label>
        </Section>

        {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

        <Button type="submit" loading={loading}>Save Draft</Button>
      </form>
    </main>
  );
}
