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

function Divider() {
  return <div style={{ height: 1, background: "var(--color-border)", margin: "24px 0" }} />;
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
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductDesc, setNewProductDesc] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loading, setLoading] = useState<"draft" | "publish" | null>(null);
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

  async function saveNewProduct() {
    if (!newProductName.trim()) return;
    setSavingProduct(true);
    setError(null);
    try {
      const product = await apiFetch<Product>("/api/products", {
        method: "POST",
        body: { name: newProductName.trim(), description: newProductDesc.trim() || undefined },
      });
      setProducts((prev) => [...(prev ?? []), product]);
      setProductId(product.id);
      setNewProductName("");
      setNewProductDesc("");
      setAddingProduct(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't save that product.");
    } finally {
      setSavingProduct(false);
    }
  }

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

  const totalCreators = ranges.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  const estimatedPayout = ranges.reduce((sum, r) => sum + (Number(r.payoutAmount) || 0) * (Number(r.quantity) || 0), 0);
  const selectedCategoryName = categories?.find((c) => c.id === categoryId)?.name;

  async function createCampaign(publish: boolean) {
    setError(null);

    if (!title.trim() || description.trim().length < 10) {
      setError("Add a title and at least a 10-character description.");
      return;
    }
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

    setLoading(publish ? "publish" : "draft");
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
      if (publish) {
        await apiFetch(`/api/campaigns/${campaign.id}/submit`, { method: "POST" });
      }
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main style={{ padding: "32px" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createCampaign(true);
        }}
        style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}
        className="campaign-create-grid"
      >
        <div className="card" style={{ padding: 28 }}>
          <label className="label">Campaign type</label>
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
              <span>Ship a product — creators will receive it and review it as their content.</span>
            </label>
          )}

          <Divider />

          <label className="label">Title</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 16 }} />

          <label className="label">Description</label>
          <textarea
            className="input"
            required
            minLength={10}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ minHeight: 90, resize: "vertical", fontFamily: "inherit" }}
          />

          {type === "CLIPPING" && (
            <>
              <label className="label" style={{ marginTop: 16 }}>Source video</label>
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
                    {sourceAssetKey ? "Ready — click to replace it." : "The raw footage creators will re-cut and post."}
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
              <label className="label" style={{ marginTop: 16 }}>Product</label>
              {!addingProduct ? (
                <>
                  <select className="input" required value={productId} onChange={(e) => setProductId(e.target.value)}>
                    <option value="">Select a product…</option>
                    {products?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setAddingProduct(true)}
                    style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "8px 0 0" }}
                  >
                    + Add a new product
                  </button>
                </>
              ) : (
                <div style={{ background: "var(--color-bg-subtle)", borderRadius: "var(--radius-control)", padding: 14 }}>
                  <input
                    className="input"
                    placeholder="Product name"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    style={{ marginBottom: 8, background: "var(--color-white)" }}
                  />
                  <input
                    className="input"
                    placeholder="Description (optional)"
                    value={newProductDesc}
                    onChange={(e) => setNewProductDesc(e.target.value)}
                    style={{ marginBottom: 10, background: "var(--color-white)" }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button type="button" loading={savingProduct} onClick={saveNewProduct}>Save product</Button>
                    <Button type="button" variant="secondary" onClick={() => setAddingProduct(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </>
          )}

          <Divider />

          <label className="label">Category</label>
          <select
            className="input"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{ marginBottom: 6, maxWidth: 340 }}
          >
            <option value="">No category — targeting only</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="helper-text" style={{ margin: "0 0 20px" }}>Matches only creators who've added this category to their profile.</p>

          <label className="label">Target creators by</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
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

          <Divider />

          <label className="label">Ranges &amp; payout</label>
          {availableSlabs === null ? (
            <p className="helper-text">Loading rate card…</p>
          ) : availableSlabs.length === 0 ? (
            <p className="error-text">No active rate card for this combination yet — try the other metric.</p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 80px 32px", gap: 8, margin: "4px 0 6px", padding: "0 2px" }}>
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
              {ranges.length < availableSlabs.length && (
                <Button type="button" variant="secondary" onClick={addRange} style={{ marginTop: 4 }}>
                  + Add Another Range
                </Button>
              )}
            </>
          )}

          <Divider />

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
        </div>

        <div className="campaign-create-summary" style={{ position: "sticky", top: 20 }}>
          <div className="card" style={{ padding: 22 }}>
            <h3 style={{ fontSize: 14.5, margin: "0 0 14px" }}>Summary</h3>

            <SummaryRow label="Type">{TYPE_INFO[type].title}{shipsProduct ? " + product" : ""}</SummaryRow>
            <SummaryRow label="Category">{selectedCategoryName ?? "Any"}</SummaryRow>
            <SummaryRow label="Targeting">{metric === "FOLLOWER_COUNT" ? "Followers" : "Reach"}</SummaryRow>
            <SummaryRow label="Creators requested">{totalCreators || "—"}</SummaryRow>
            <SummaryRow label="Est. payout">{estimatedPayout > 0 ? `₹${estimatedPayout.toLocaleString("en-IN")}` : "—"}</SummaryRow>

            <p className="helper-text" style={{ margin: "10px 0 0" }}>Platform fee and GST are added at review.</p>

            {error && <p className="error-text" style={{ margin: "14px 0 0" }}>{error}</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
              <Button type="submit" loading={loading === "publish"} disabled={loading === "draft"}>
                Publish Campaign
              </Button>
              <Button
                type="button"
                variant="secondary"
                loading={loading === "draft"}
                disabled={loading === "publish"}
                onClick={() => createCampaign(false)}
              >
                Save Draft
              </Button>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", fontSize: 13.5 }}>
      <span className="helper-text" style={{ margin: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{children}</span>
    </div>
  );
}
