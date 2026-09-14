"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../../../components/Button";
import { PageLoader } from "../../../components/PageLoader";
import { AdminEmpty, AdminIntro, Avatar, DemoBanner, DemoTag, StatusBadge, formatDate, formatINR, humanize } from "../../../components/admin/AdminUI";
import { MegaphoneIcon } from "../../../components/icons";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { DEMO_LIVE_CAMPAIGNS, DEMO_REVIEW_CAMPAIGNS, isDemoId, withDemo } from "../../../lib/adminDemo";
import { useConfirm } from "../../../lib/useConfirm";

interface ReviewCampaign {
  id: string;
  code: string;
  title: string;
  type: string;
  status: string;
  submittedAt: string | null;
  brand: { companyName: string };
  pricingSnapshots: Array<{ totalAmount: string }>;
}

interface TargetingSlab {
  id: string;
  minValue: number;
  maxValue: number | null;
  quantity: number;
  reserved: number;
}
interface LiveCampaign {
  id: string;
  code: string;
  title: string;
  type: string;
  status: string;
  liveAt: string | null;
  brand: { companyName: string };
  targetingSlabs: TargetingSlab[];
}
interface MatchingResult {
  campaignId: string;
  offersCreated: number;
  perSlab: Array<{ slabId: string; requested: number; matched: number; stillShort: number }>;
}
interface AnyCampaign {
  id: string;
  code: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  brand: { companyName: string };
  pricingSnapshots: Array<{ totalAmount: string }>;
  payments: Array<{ status: string }>;
}

function slabLabel(s: TargetingSlab): string {
  const min = s.minValue.toLocaleString("en-IN");
  return s.maxValue == null ? `${min}+` : `${min} – ${s.maxValue.toLocaleString("en-IN")}`;
}

const TABS = [
  { key: "review", label: "Waiting for review" },
  { key: "live", label: "Live campaigns" },
  { key: "all", label: "All campaigns" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function CampaignReviewsPage() {
  const confirm = useConfirm();
  const [tab, setTab] = useState<TabKey>("review");
  const [queue, setQueue] = useState<ReviewCampaign[] | null>(null);
  const [live, setLive] = useState<LiveCampaign[] | null>(null);
  const [all, setAll] = useState<AnyCampaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [matchResults, setMatchResults] = useState<Record<string, MatchingResult>>({});

  function loadQueue() {
    apiFetch<ReviewCampaign[]>("/api/campaigns/review-queue")
      .then(setQueue)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Failed to load the queue.");
        setLoadError(true);
        setQueue([]);
      });
  }
  function loadLive() {
    apiFetch<LiveCampaign[]>("/api/campaigns/live")
      .then(setLive)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Failed to load live campaigns.");
        setLoadError(true);
        setLive([]);
      });
  }
  function loadAll() {
    apiFetch<AnyCampaign[]>("/api/campaigns/all")
      .then(setAll)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Failed to load campaigns.");
        setLoadError(true);
        setAll([]);
      });
  }
  useEffect(() => {
    loadQueue();
    loadLive();
    loadAll();
  }, []);

  async function approve(id: string, title: string) {
    const confirmed = await confirm({
      title: "Approve this campaign?",
      description: `"${title}" will move to Payment Pending — the brand is notified to pay.`,
    });
    if (!confirmed) return;

    setActingOn(id);
    setError(null);
    try {
      await apiFetch(`/api/campaigns/${id}/approve`, { method: "POST" });
      loadQueue();
      loadAll();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  async function reject(id: string, title: string) {
    const reason = await confirm({
      title: "Reject this campaign?",
      description: `"${title}" will be sent back to the brand as REJECTED.`,
      impact: "The brand will need to revise and resubmit it.",
      danger: true,
      confirmLabel: "Reject",
      requireInput: true,
      inputLabel: "Reason (shown to the brand)",
      minInputLength: 5,
    });
    if (typeof reason !== "string") return;

    setActingOn(id);
    setError(null);
    try {
      await apiFetch(`/api/campaigns/${id}/reject`, { method: "POST", body: { reason } });
      loadQueue();
      loadAll();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  async function runMatching(id: string, title: string) {
    const confirmed = await confirm({
      title: "Run matching?",
      description: `Sends offers to every eligible creator still needed to fill "${title}"'s open slabs. Safe to run more than once — it only tops up slabs still short, never re-offers a creator who already has one.`,
    });
    if (!confirmed) return;

    setActingOn(id);
    setError(null);
    try {
      const result = await apiFetch<MatchingResult>(`/api/campaigns/${id}/match`, { method: "POST" });
      setMatchResults((prev) => ({ ...prev, [id]: result }));
      loadLive();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  const review = withDemo(queue, DEMO_REVIEW_CAMPAIGNS, { allow: !loadError });
  const liveList = withDemo(live, DEMO_LIVE_CAMPAIGNS, { allow: !loadError });
  if (!review.items || !liveList.items || !all) return <PageLoader />;

  const counts = { review: review.isDemo ? 0 : review.items.length, live: liveList.isDemo ? 0 : liveList.items.length, all: all.length };
  const showDemo = tab === "review" ? review.isDemo : tab === "live" ? liveList.isDemo : false;

  return (
    <div className="adm-stack">
      <AdminIntro icon={MegaphoneIcon} tint="purple">
        Approve or reject the campaigns brands submit. Once a campaign is paid and live, run matching here to send offers to
        eligible creators.
      </AdminIntro>

      <div className="adm-toolbar">
        <div className="adm-tabs" role="tablist" aria-label="Campaign lists">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`adm-tab${tab === t.key ? " is-active" : ""}`} onClick={() => setTab(t.key)}>
              {t.label}
              <span className="adm-tab-count">{counts[t.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <DemoBanner show={showDemo} />
      {error && <p className="error-text">{error}</p>}

      {tab === "review" &&
        (review.items.length === 0 ? (
          <AdminEmpty icon={MegaphoneIcon} title="No campaigns waiting for review" text="When a brand submits a campaign, it appears here for approval." />
        ) : (
          <div className="adm-list">
            {review.items.map((c) => {
              const demo = isDemoId(c.id);
              return (
                <div key={c.id} className={`adm-row${demo ? " is-demo" : ""}`}>
                  <div className="adm-row-main">
                    <Avatar name={c.brand.companyName} square />
                    <div style={{ minWidth: 0 }}>
                      <div className="adm-row-meta">
                        <StatusBadge status="UNDER_REVIEW" label="Awaiting review" />
                        <span className="adm-chip">{humanize(c.type)}</span>
                        {demo && <DemoTag />}
                      </div>
                      <div className="adm-row-title">{c.title}</div>
                      <div className="adm-row-sub">
                        {c.brand.companyName} · {c.code} · Submitted {formatDate(c.submittedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="adm-row-side">
                    <span className="adm-amount">{c.pricingSnapshots[0] ? formatINR(c.pricingSnapshots[0].totalAmount) : "—"}</span>
                    {!demo && <Link href={`/admin/campaigns/${c.id}`} className="adm-view-link">View →</Link>}
                    <Button variant="danger" disabled={demo} loading={actingOn === c.id} onClick={() => reject(c.id, c.title)}>
                      Reject
                    </Button>
                    <Button disabled={demo} loading={actingOn === c.id} onClick={() => approve(c.id, c.title)}>
                      Approve
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      {tab === "live" &&
        (liveList.items.length === 0 ? (
          <AdminEmpty icon={MegaphoneIcon} title="No live campaigns right now" text="Paid campaigns show up here, ready for creator matching." />
        ) : (
          <div className="adm-list">
            {liveList.items.map((c) => {
              const demo = isDemoId(c.id);
              const totalQuantity = c.targetingSlabs.reduce((s, sl) => s + sl.quantity, 0);
              const totalReserved = c.targetingSlabs.reduce((s, sl) => s + sl.reserved, 0);
              const fullyMatched = totalQuantity > 0 && totalReserved >= totalQuantity;
              const result = matchResults[c.id];
              return (
                <div key={c.id} className={`adm-row${demo ? " is-demo" : ""}`}>
                  <div className="adm-row-main" style={{ alignItems: "flex-start" }}>
                    <Avatar name={c.brand.companyName} square />
                    <div style={{ minWidth: 0 }}>
                      <div className="adm-row-meta">
                        <StatusBadge status={c.status} />
                        <span className="adm-chip">{humanize(c.type)}</span>
                        {demo && <DemoTag />}
                      </div>
                      <div className="adm-row-title">{c.title}</div>
                      <div className="adm-row-sub">
                        {c.brand.companyName} · {c.code} · Live since {formatDate(c.liveAt)}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                        {c.targetingSlabs.map((s) => (
                          <span key={s.id} className="adm-chip">
                            Band {slabLabel(s)}: {s.reserved}/{s.quantity} matched
                          </span>
                        ))}
                      </div>
                      {result && (
                        <p className="adm-row-note">
                          Last run: {result.offersCreated} offer{result.offersCreated === 1 ? "" : "s"} sent —{" "}
                          {result.perSlab.map((p) => `${p.matched}/${p.requested} matched`).join(", ")}
                          {result.perSlab.some((p) => p.stillShort > 0) && " (some bands are still short on eligible creators)."}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="adm-row-side">
                    <div style={{ textAlign: "right" }}>
                      <div className="adm-amount" style={{ color: fullyMatched ? "var(--color-success)" : undefined }}>
                        {totalReserved}/{totalQuantity}
                      </div>
                      <div className="helper-text" style={{ marginTop: 0 }}>creators matched</div>
                    </div>
                    {!demo && <Link href={`/admin/campaigns/${c.id}`} className="adm-view-link">View →</Link>}
                    <Button disabled={demo || fullyMatched} loading={actingOn === c.id} onClick={() => runMatching(c.id, c.title)}>
                      {fullyMatched ? "Fully matched" : "Run matching"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      {tab === "all" &&
        (all.length === 0 ? (
          <AdminEmpty icon={MegaphoneIcon} title="No campaigns yet" text="Every campaign a brand creates shows up here, whatever its status." />
        ) : (
          <div className="adm-table-wrap">
            <div className="adm-table-scroll">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Value</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {all.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 650 }}>{c.title}</div>
                        <div className="helper-text" style={{ marginTop: 1 }}>{c.brand.companyName} · {c.code}</div>
                      </td>
                      <td>{humanize(c.type)}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td>{c.payments[0] ? <StatusBadge status={c.payments[0].status} /> : <span className="helper-text">—</span>}</td>
                      <td style={{ fontWeight: 650, whiteSpace: "nowrap" }}>{c.pricingSnapshots[0] ? formatINR(c.pricingSnapshots[0].totalAmount) : "—"}</td>
                      <td className="helper-text" style={{ whiteSpace: "nowrap" }}>{formatDate(c.createdAt)}</td>
                      <td><Link href={`/admin/campaigns/${c.id}`} className="adm-view-link">View →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  );
}
