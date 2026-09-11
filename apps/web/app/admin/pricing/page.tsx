"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/Button";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";

interface Slab {
  id: string;
  campaignType: string;
  metric: string;
  minValue: number;
  maxValue: number | null;
  payoutAmount: string;
  feeAmount: string;
  active: boolean;
}

interface TaxRule {
  id: string;
  taxType: string;
  rate: string;
  transactionType: string;
  applicableParty: string;
  jurisdiction: string;
  active: boolean;
}

const METRIC_LABEL: Record<string, string> = { FOLLOWER_COUNT: "Followers", AVERAGE_REACH: "Reach" };
const TYPE_LABEL: Record<string, string> = { CLIPPING: "Clipping", CREATOR_CONTENT: "Creator Content", PRODUCT_REVIEW: "Product Review" };

function fmtRange(min: number, max: number | null, metric: string) {
  const unit = metric === "AVERAGE_REACH" ? "reach" : "followers";
  const f = (n: number) => n.toLocaleString("en-IN");
  return max ? `${f(min)}–${f(max)} ${unit}` : `${f(min)}+ ${unit}`;
}

function SlabRow({ slab, onSaved }: { slab: Slab; onSaved: (s: Slab) => void }) {
  const [payout, setPayout] = useState(slab.payoutAmount);
  const [fee, setFee] = useState(slab.feeAmount);
  const [active, setActive] = useState(slab.active);
  const [saving, setSaving] = useState(false);
  const dirty = payout !== slab.payoutAmount || fee !== slab.feeAmount || active !== slab.active;
  const takePct = Number(payout) + Number(fee) > 0 ? ((Number(fee) / (Number(payout) + Number(fee))) * 100).toFixed(1) : "0.0";

  async function save() {
    setSaving(true);
    try {
      const updated = await apiFetch<Slab>(`/api/admin/pricing-slabs/${slab.id}`, {
        method: "PATCH",
        body: { payoutAmount: Number(payout), feeAmount: Number(fee), active },
      });
      onSaved(updated);
    } catch {
      /* surfaced via the row staying dirty */
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr style={{ borderBottom: "1px solid var(--color-border)", opacity: active ? 1 : 0.5 }}>
      <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{fmtRange(slab.minValue, slab.maxValue, slab.metric)}</td>
      <td style={{ padding: "8px 10px" }}>
        <input className="input" type="number" value={payout} onChange={(e) => setPayout(e.target.value)} style={{ width: 100, padding: "6px 10px" }} />
      </td>
      <td style={{ padding: "8px 10px" }}>
        <input className="input" type="number" value={fee} onChange={(e) => setFee(e.target.value)} style={{ width: 90, padding: "6px 10px" }} />
      </td>
      <td style={{ padding: "8px 10px", fontSize: 12.5, color: "var(--color-text-secondary)" }}>{takePct}%</td>
      <td style={{ padding: "8px 10px" }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
      </td>
      <td style={{ padding: "8px 10px" }}>
        {dirty && <Button type="button" loading={saving} onClick={save}>Save</Button>}
      </td>
    </tr>
  );
}

function NewSlabForm({ campaignType, metric, onCreated }: { campaignType: string; metric: string; onCreated: (s: Slab) => void }) {
  const [open, setOpen] = useState(false);
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setError(null);
    setSaving(true);
    try {
      const slab = await apiFetch<Slab>("/api/admin/pricing-slabs", {
        method: "POST",
        body: {
          campaignType,
          metric,
          minValue: Number(minValue),
          maxValue: maxValue ? Number(maxValue) : null,
          payoutAmount: Number(payoutAmount),
          feeAmount: Number(feeAmount),
        },
      });
      onCreated(slab);
      setOpen(false);
      setMinValue("");
      setMaxValue("");
      setPayoutAmount("");
      setFeeAmount("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't add that band.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "8px 0 0" }}>
        + Add band
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8, background: "var(--color-bg-subtle)", borderRadius: "var(--radius-control)", padding: 10 }}>
      <input className="input" placeholder="Min" type="number" value={minValue} onChange={(e) => setMinValue(e.target.value)} style={{ width: 90, background: "var(--color-white)" }} />
      <input className="input" placeholder="Max (blank = ∞)" type="number" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} style={{ width: 130, background: "var(--color-white)" }} />
      <input className="input" placeholder="Payout ₹" type="number" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} style={{ width: 100, background: "var(--color-white)" }} />
      <input className="input" placeholder="Fee ₹" type="number" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} style={{ width: 90, background: "var(--color-white)" }} />
      <Button type="button" loading={saving} onClick={create}>Add</Button>
      <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
      {error && <p className="error-text" style={{ margin: 0, width: "100%" }}>{error}</p>}
    </div>
  );
}

function TaxRuleRow({ rule, onSaved }: { rule: TaxRule; onSaved: (r: TaxRule) => void }) {
  const [rate, setRate] = useState(rule.rate);
  const [active, setActive] = useState(rule.active);
  const [saving, setSaving] = useState(false);
  const dirty = rate !== rule.rate || active !== rule.active;

  async function save() {
    setSaving(true);
    try {
      const updated = await apiFetch<TaxRule>(`/api/admin/tax-rules/${rule.id}`, {
        method: "PATCH",
        body: { rate: Number(rate), active },
      });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr style={{ borderBottom: "1px solid var(--color-border)", opacity: active ? 1 : 0.5 }}>
      <td style={{ padding: "8px 10px" }}>{rule.taxType}</td>
      <td style={{ padding: "8px 10px" }}>{rule.applicableParty === "BRAND" ? "Brand" : "Creator"}</td>
      <td style={{ padding: "8px 10px" }}>{rule.transactionType.replace(/_/g, " ")}</td>
      <td style={{ padding: "8px 10px" }}>
        <input className="input" type="number" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} style={{ width: 80, padding: "6px 10px" }} />%
      </td>
      <td style={{ padding: "8px 10px" }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
      </td>
      <td style={{ padding: "8px 10px" }}>
        {dirty && <Button type="button" loading={saving} onClick={save}>Save</Button>}
      </td>
    </tr>
  );
}

export default function AdminPricingPage() {
  const [slabs, setSlabs] = useState<Slab[] | null>(null);
  const [taxRules, setTaxRules] = useState<TaxRule[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Slab[]>("/api/admin/pricing-slabs").then(setSlabs).catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load."));
    apiFetch<TaxRule[]>("/api/admin/tax-rules").then(setTaxRules).catch(() => setTaxRules([]));
  }, []);

  const groups = useMemo(() => {
    if (!slabs) return [];
    const map = new Map<string, Slab[]>();
    for (const s of slabs) {
      const key = `${s.campaignType}|${s.metric}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries())
      .map(([key, rows]) => {
        const [campaignType, metric] = key.split("|");
        return { campaignType, metric, rows: rows.sort((a, b) => a.minValue - b.minValue) };
      })
      .sort((a, b) => a.campaignType.localeCompare(b.campaignType) || a.metric.localeCompare(b.metric));
  }, [slabs]);

  function updateSlab(updated: Slab) {
    setSlabs((prev) => prev?.map((s) => (s.id === updated.id ? updated : s)) ?? null);
  }
  function addSlab(created: Slab) {
    setSlabs((prev) => [...(prev ?? []), created]);
  }
  function updateTaxRule(updated: TaxRule) {
    setTaxRules((prev) => prev?.map((r) => (r.id === updated.id ? updated : r)) ?? null);
  }

  if (error) return <p className="error-text">{error}</p>;

  return (
    <div>
      {!slabs ? (
        <p className="helper-text">Loading…</p>
      ) : (
        groups.map((g) => (
          <div key={`${g.campaignType}|${g.metric}`} className="card" style={{ marginBottom: 16, padding: 20 }}>
            <h3 style={{ fontSize: 14.5, margin: "0 0 12px" }}>
              {TYPE_LABEL[g.campaignType] ?? g.campaignType} · {METRIC_LABEL[g.metric] ?? g.metric}
            </h3>
            <div className="table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                    <th style={{ padding: "8px 10px" }}>Range</th>
                    <th style={{ padding: "8px 10px" }}>Creator payout ₹</th>
                    <th style={{ padding: "8px 10px" }}>Platform fee ₹</th>
                    <th style={{ padding: "8px 10px" }}>Take %</th>
                    <th style={{ padding: "8px 10px" }}>Active</th>
                    <th style={{ padding: "8px 10px" }} />
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((s) => (
                    <SlabRow key={s.id} slab={s} onSaved={updateSlab} />
                  ))}
                </tbody>
              </table>
            </div>
            <NewSlabForm campaignType={g.campaignType} metric={g.metric} onCreated={addSlab} />
          </div>
        ))
      )}

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14.5, margin: "0 0 4px" }}>Tax &amp; fee rules</h3>
        <p className="helper-text" style={{ marginBottom: 12 }}>
          Applied as a percentage on top of the platform fee above (GST today; a Brand or Creator-side rule can be
          added the same way).
        </p>
        {!taxRules ? (
          <p className="helper-text">Loading…</p>
        ) : taxRules.length === 0 ? (
          <p className="helper-text">No tax/fee rules yet.</p>
        ) : (
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                  <th style={{ padding: "8px 10px" }}>Type</th>
                  <th style={{ padding: "8px 10px" }}>Applies to</th>
                  <th style={{ padding: "8px 10px" }}>Transaction</th>
                  <th style={{ padding: "8px 10px" }}>Rate</th>
                  <th style={{ padding: "8px 10px" }}>Active</th>
                  <th style={{ padding: "8px 10px" }} />
                </tr>
              </thead>
              <tbody>
                {taxRules.map((r) => (
                  <TaxRuleRow key={r.id} rule={r} onSaved={updateTaxRule} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
