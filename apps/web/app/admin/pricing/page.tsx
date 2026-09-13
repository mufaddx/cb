"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/Button";
import { PageLoader } from "../../../components/PageLoader";
import { AdminEmpty, AdminIntro, DemoBanner, DemoTag } from "../../../components/admin/AdminUI";
import { TagIcon } from "../../../components/icons";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { DEMO_SLABS, DEMO_TAX_RULES, withDemo } from "../../../lib/adminDemo";

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

function SlabRow({ slab, demo, onSaved }: { slab: Slab; demo: boolean; onSaved: (s: Slab) => void }) {
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
    <tr style={{ opacity: active ? 1 : 0.5 }}>
      <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{fmtRange(slab.minValue, slab.maxValue, slab.metric)}</td>
      <td>
        <input className="input" type="number" value={payout} disabled={demo} onChange={(e) => setPayout(e.target.value)} style={{ width: 110, padding: "7px 10px" }} aria-label="Creator payout" />
      </td>
      <td>
        <input className="input" type="number" value={fee} disabled={demo} onChange={(e) => setFee(e.target.value)} style={{ width: 100, padding: "7px 10px" }} aria-label="Platform fee" />
      </td>
      <td className="helper-text">{takePct}%</td>
      <td>
        <input type="checkbox" checked={active} disabled={demo} onChange={(e) => setActive(e.target.checked)} aria-label="Active" />
      </td>
      <td>{demo ? <DemoTag /> : dirty && <Button type="button" loading={saving} onClick={save}>Save</Button>}</td>
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
      <button type="button" onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", padding: "12px 16px" }}>
        + Add band
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: 12, background: "var(--color-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-control)", padding: 10 }}>
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

function TaxRuleRow({ rule, demo, onSaved }: { rule: TaxRule; demo: boolean; onSaved: (r: TaxRule) => void }) {
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
    <tr style={{ opacity: active ? 1 : 0.5 }}>
      <td style={{ fontWeight: 600 }}>{rule.taxType}</td>
      <td>{rule.applicableParty === "BRAND" ? "Brand" : "Creator"}</td>
      <td>{rule.transactionType.replace(/_/g, " ").toLowerCase()}</td>
      <td style={{ whiteSpace: "nowrap" }}>
        <input className="input" type="number" step="0.1" value={rate} disabled={demo} onChange={(e) => setRate(e.target.value)} style={{ width: 80, padding: "7px 10px" }} aria-label="Rate" /> %
      </td>
      <td>
        <input type="checkbox" checked={active} disabled={demo} onChange={(e) => setActive(e.target.checked)} aria-label="Active" />
      </td>
      <td>{demo ? <DemoTag /> : dirty && <Button type="button" loading={saving} onClick={save}>Save</Button>}</td>
    </tr>
  );
}

export default function AdminPricingPage() {
  const [slabs, setSlabs] = useState<Slab[] | null>(null);
  const [taxRules, setTaxRules] = useState<TaxRule[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Slab[]>("/api/admin/pricing-slabs")
      .then(setSlabs)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Failed to load.");
        setSlabs([]);
      });
    apiFetch<TaxRule[]>("/api/admin/tax-rules").then(setTaxRules).catch(() => setTaxRules([]));
  }, []);

  const slabView = withDemo(slabs, DEMO_SLABS, { allow: !error });
  const taxView = withDemo(taxRules, DEMO_TAX_RULES, { allow: !error });

  const groups = useMemo(() => {
    if (!slabView.items) return [];
    const map = new Map<string, Slab[]>();
    for (const s of slabView.items) {
      const key = `${s.campaignType}|${s.metric}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries())
      .map(([key, rows]) => {
        const [campaignType, metric] = key.split("|");
        return { campaignType, metric, rows: [...rows].sort((a, b) => a.minValue - b.minValue) };
      })
      .sort((a, b) => a.campaignType.localeCompare(b.campaignType) || a.metric.localeCompare(b.metric));
  }, [slabView.items]);

  function updateSlab(updated: Slab) {
    setSlabs((prev) => prev?.map((s) => (s.id === updated.id ? updated : s)) ?? null);
  }
  function addSlab(created: Slab) {
    setSlabs((prev) => [...(prev ?? []), created]);
  }
  function updateTaxRule(updated: TaxRule) {
    setTaxRules((prev) => prev?.map((r) => (r.id === updated.id ? updated : r)) ?? null);
  }

  if (!slabView.items || !taxView.items) return <PageLoader />;

  return (
    <div className="adm-stack">
      <AdminIntro icon={TagIcon} tint="amber">
        The rate card: how much a creator is paid and what fee Vidlix keeps for each follower or reach band, per campaign
        type. Brands see these prices when they create a campaign. Tax rules are added on top of the platform fee.
      </AdminIntro>
      <DemoBanner show={slabView.isDemo || taxView.isDemo} />
      {error && <p className="error-text">{error}</p>}

      {groups.length === 0 ? (
        <AdminEmpty icon={TagIcon} title="No rate card bands yet" text="Pricing bands define creator payout and platform fee by follower or reach range." />
      ) : (
        groups.map((g) => (
          <div key={`${g.campaignType}|${g.metric}`} className="adm-panel">
            <div className="adm-panel-head">
              <h3>
                {TYPE_LABEL[g.campaignType] ?? g.campaignType} · priced by {(METRIC_LABEL[g.metric] ?? g.metric).toLowerCase()}
              </h3>
              <span className="adm-chip">
                {g.rows.length} band{g.rows.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="adm-table-scroll">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Range</th>
                    <th>Creator payout ₹</th>
                    <th>Platform fee ₹</th>
                    <th>Vidlix take</th>
                    <th>Active</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((s) => (
                    <SlabRow key={s.id} slab={s} demo={slabView.isDemo} onSaved={updateSlab} />
                  ))}
                </tbody>
              </table>
            </div>
            {!slabView.isDemo && <NewSlabForm campaignType={g.campaignType} metric={g.metric} onCreated={addSlab} />}
          </div>
        ))
      )}

      <div className="adm-panel">
        <div className="adm-panel-head">
          <h3>Tax &amp; fee rules</h3>
          <span className="helper-text" style={{ margin: 0 }}>Applied as a percentage on top of the platform fee</span>
        </div>
        {taxView.items.length === 0 ? (
          <p className="adm-panel-empty">No tax or fee rules yet.</p>
        ) : (
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Applies to</th>
                  <th>Charged on</th>
                  <th>Rate</th>
                  <th>Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {taxView.items.map((r) => (
                  <TaxRuleRow key={r.id} rule={r} demo={taxView.isDemo} onSaved={updateTaxRule} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
