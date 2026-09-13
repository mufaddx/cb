"use client";

import type { SVGProps } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminIntro, Avatar, DemoBanner, DemoTag, StatusBadge, formatDate, formatINR } from "../../components/admin/AdminUI";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BuildingIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  FileTextIcon,
  HomeIcon,
  IdCardIcon,
  LifeBuoyIcon,
  MegaphoneIcon,
  ScaleIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
} from "../../components/icons";
import { apiFetch } from "../../lib/apiClient";
import {
  DEMO_ANALYTICS,
  DEMO_QUEUE_COUNTS,
  DEMO_REVIEW_CAMPAIGNS,
  DEMO_WITHDRAWALS,
  demoNumber,
  isDemoId,
  withDemo,
} from "../../lib/adminDemo";

type Icon = (props: SVGProps<SVGSVGElement>) => JSX.Element;
type Tint = "purple" | "blue" | "green" | "pink" | "amber";

interface Analytics {
  brands: number;
  creators: number;
  campaigns: { total: number; live: number; completed: number };
  gmv: number;
  netRevenueEstimate: number;
  payments: { count: number; totalAmount: number };
  refunds: { count: number; totalAmount: number };
  creatorPayouts: { totalAmount: number };
  pendingWithdrawals: number;
  openDisputes: number;
  openFraudFlags: number;
}

interface ReviewCampaign {
  id: string;
  code: string;
  title: string;
  submittedAt: string | null;
  brand: { companyName: string };
  pricingSnapshots: Array<{ totalAmount: string }>;
}

interface WithdrawalItem {
  id: string;
  amount: string;
  status: string;
  requestedAt: string;
  creator: { fullName: string; displayName: string };
}

// null = still loading, "error" = no access / request failed
type Loaded<T> = T | null | "error";

async function load<T>(path: string): Promise<T | "error"> {
  try {
    return await apiFetch<T>(path);
  } catch {
    return "error";
  }
}

function Kpi({
  href,
  icon: IconCmp,
  tint,
  label,
  value,
  sample,
  desc,
  foot,
  attention,
}: {
  href: string;
  icon: Icon;
  tint: Tint;
  label: string;
  value: string;
  sample?: boolean;
  desc: string;
  foot?: string;
  attention?: boolean;
}) {
  return (
    <Link href={href} className={`adm-kpi${attention ? " is-attention" : ""}`}>
      <div className="adm-kpi-head">
        <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span className={`icon-badge icon-badge-${tint}`} aria-hidden="true">
            <IconCmp width={17} height={17} />
          </span>
          <span className="adm-kpi-label">{label}</span>
        </span>
        {sample && <DemoTag label="Sample" />}
      </div>
      <div className="adm-kpi-value">{value}</div>
      <div className="adm-kpi-desc">{desc}</div>
      <div className="adm-kpi-foot">
        <span>{foot ?? "Open"}</span>
        <ArrowRightIcon width={14} height={14} />
      </div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<Loaded<Analytics>>(null);
  const [lists, setLists] = useState<Record<string, Loaded<unknown[]>>>({});

  useEffect(() => {
    load<Analytics>("/api/admin/analytics").then(setAnalytics);
    const queues: Record<string, string> = {
      campaigns: "/api/campaigns/review-queue",
      verification: "/api/verifications/queue",
      content: "/api/content/queue",
      retention: "/api/retention/queue",
      kyc: "/api/kyc/queue",
      withdrawals: "/api/withdrawals/queue",
      disputes: "/api/disputes/queue",
      fraud: "/api/fraud/queue",
      support: "/api/support/tickets/queue",
    };
    for (const [key, path] of Object.entries(queues)) {
      load<unknown[]>(path).then((res) => setLists((prev) => ({ ...prev, [key]: res })));
    }
  }, []);

  let sampleUsed = false;

  // A queue box: real count, "—" when this admin role can't see it, or a
  // flagged sample number when the real queue is empty.
  function queueValue(key: keyof typeof DEMO_QUEUE_COUNTS, filter?: (row: unknown) => boolean) {
    const raw = lists[key];
    if (raw === undefined || raw === null) return { text: "…", sample: false, noAccess: false };
    if (raw === "error") return { text: "—", sample: false, noAccess: true };
    const count = filter ? raw.filter(filter).length : raw.length;
    const n = demoNumber(count, DEMO_QUEUE_COUNTS[key]);
    if (n.sample) sampleUsed = true;
    return { text: String(n.value), sample: n.sample, noAccess: false };
  }

  function moneyValue(real: number | undefined, sample: number, asCount = false) {
    if (analytics === null) return { text: "…", sample: false };
    if (analytics === "error" || real === undefined) return { text: "—", sample: false };
    const n = demoNumber(real, sample);
    if (n.sample) sampleUsed = true;
    const v = n.value ?? 0;
    return { text: asCount ? v.toLocaleString("en-IN") : formatINR(v), sample: n.sample };
  }

  const a = analytics && analytics !== "error" ? analytics : undefined;

  const withdrawalsRaw = lists.withdrawals;
  const withdrawalRows = Array.isArray(withdrawalsRaw) ? (withdrawalsRaw as WithdrawalItem[]) : null;
  const pendingAmountReal = withdrawalRows ? withdrawalRows.reduce((s, w) => s + Number(w.amount), 0) : null;

  const q = {
    campaigns: queueValue("campaigns"),
    kyc: queueValue("kyc"),
    withdrawals: queueValue("withdrawals"),
    content: queueValue("content"),
    verification: queueValue("verification"),
    retention: queueValue("retention"),
    disputes: queueValue("disputes"),
    fraud: queueValue("fraud"),
    support: queueValue("support", (t) => {
      const status = (t as { status?: string }).status;
      return status === "OPEN" || status === "IN_PROGRESS";
    }),
  };
  const pendingAmount = q.withdrawals.sample ? DEMO_QUEUE_COUNTS.withdrawalsAmount : pendingAmountReal;

  const money = {
    revenue: moneyValue(a?.netRevenueEstimate, DEMO_ANALYTICS.netRevenueEstimate),
    gmv: moneyValue(a?.gmv, DEMO_ANALYTICS.gmv),
    payouts: moneyValue(a?.creatorPayouts.totalAmount, DEMO_ANALYTICS.creatorPayouts),
    refunds: moneyValue(a?.refunds.totalAmount, DEMO_ANALYTICS.refundsAmount),
  };
  const platform = {
    brands: moneyValue(a?.brands, DEMO_ANALYTICS.brands, true),
    creators: moneyValue(a?.creators, DEMO_ANALYTICS.creators, true),
    campaigns: moneyValue(a?.campaigns.total, DEMO_ANALYTICS.campaignsTotal, true),
    live: moneyValue(a?.campaigns.live, DEMO_ANALYTICS.campaignsLive, true),
    completed: moneyValue(a?.campaigns.completed, DEMO_ANALYTICS.campaignsCompleted, true),
    payments: moneyValue(a?.payments.count, DEMO_ANALYTICS.paymentsCount, true),
  };

  const reviewRows = Array.isArray(lists.campaigns) ? (lists.campaigns as ReviewCampaign[]) : null;
  const latestReviews = withDemo(reviewRows, DEMO_REVIEW_CAMPAIGNS);
  const latestWithdrawals = withDemo(withdrawalRows, DEMO_WITHDRAWALS);

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const noAccessDesc = "Your admin role doesn't have access to this queue.";

  return (
    <div className="adm-stack" style={{ gap: 28 }}>
      <AdminIntro icon={HomeIcon} tint="blue" meta={<span className="adm-chip">{today}</span>}>
        Everything that needs attention across Vidlix, in one place. Click any box to open the page where you handle it.
      </AdminIntro>

      <DemoBanner show={sampleUsed}>
        <strong>Some numbers are sample values.</strong> Boxes tagged <em>Sample</em> have no real data yet, so an example
        number is shown to preview the dashboard. Every other number is live from the database.
      </DemoBanner>

      <section>
        <div className="adm-section-title">
          <h2>Needs your action</h2>
          <span>Items waiting on an admin decision</span>
        </div>
        <div className="adm-kpis adm-kpis-3">
          <Kpi href="/admin/campaigns" icon={MegaphoneIcon} tint="purple" label="Campaign reviews" value={q.campaigns.text} sample={q.campaigns.sample} attention={q.campaigns.text !== "0" && !q.campaigns.noAccess} desc={q.campaigns.noAccess ? noAccessDesc : "Campaigns brands submitted, waiting for approve or reject."} foot="Review campaigns" />
          <Kpi href="/admin/withdrawals" icon={WalletIcon} tint="green" label="Withdrawals" value={q.withdrawals.text} sample={q.withdrawals.sample} attention={q.withdrawals.text !== "0" && !q.withdrawals.noAccess} desc={q.withdrawals.noAccess ? noAccessDesc : pendingAmount != null ? `${formatINR(pendingAmount)} requested by creators, to approve and pay via UPI.` : "Creator payout requests to approve and pay via UPI."} foot="Process payouts" />
          <Kpi href="/admin/kyc" icon={IdCardIcon} tint="blue" label="KYC reviews" value={q.kyc.text} sample={q.kyc.sample} attention={q.kyc.text !== "0" && !q.kyc.noAccess} desc={q.kyc.noAccess ? noAccessDesc : "Creator identity documents to verify before they can withdraw."} foot="Verify documents" />
          <Kpi href="/admin/content" icon={FileTextIcon} tint="pink" label="Content review" value={q.content.text} sample={q.content.sample} desc={q.content.noAccess ? noAccessDesc : "Creator videos submitted for approval or a revision request."} foot="Review content" />
          <Kpi href="/admin/verification" icon={CheckCircleIcon} tint="green" label="Post verification" value={q.verification.text} sample={q.verification.sample} desc={q.verification.noAccess ? noAccessDesc : "Published posts whose automated checks need a manual pass/fail."} foot="Verify posts" />
          <Kpi href="/admin/retention" icon={ClockIcon} tint="amber" label="Retention checks" value={q.retention.text} sample={q.retention.sample} desc={q.retention.noAccess ? noAccessDesc : "Posts that must stay live for a set period before payout."} foot="Check retention" />
          <Kpi href="/admin/disputes" icon={ScaleIcon} tint="purple" label="Open disputes" value={q.disputes.text} sample={q.disputes.sample} attention={q.disputes.text !== "0" && !q.disputes.noAccess} desc={q.disputes.noAccess ? noAccessDesc : "Brand–creator disagreements that need a decision."} foot="Resolve disputes" />
          <Kpi href="/admin/fraud" icon={AlertTriangleIcon} tint="amber" label="Fraud flags" value={q.fraud.text} sample={q.fraud.sample} attention={q.fraud.text !== "0" && !q.fraud.noAccess} desc={q.fraud.noAccess ? noAccessDesc : "Suspicious accounts flagged by risk checks."} foot="Review flags" />
          <Kpi href="/admin/support" icon={LifeBuoyIcon} tint="blue" label="Support tickets" value={q.support.text} sample={q.support.sample} desc={q.support.noAccess ? noAccessDesc : "Open questions from brands and creators waiting for a reply."} foot="Reply to tickets" />
        </div>
      </section>

      <section>
        <div className="adm-section-title">
          <h2>Revenue &amp; money</h2>
          <span>All-time totals</span>
        </div>
        <div className="adm-kpis">
          <Kpi href="/admin/payments" icon={TrendingUpIcon} tint="green" label="Platform revenue" value={money.revenue.text} sample={money.revenue.sample} desc="Estimated net platform fees earned after refunds." foot="View payments" />
          <Kpi href="/admin/payments" icon={CreditCardIcon} tint="blue" label="GMV (brand payments)" value={money.gmv.text} sample={money.gmv.sample} desc="Total amount brands have paid into campaigns." foot="View payments" />
          <Kpi href="/admin/withdrawals" icon={WalletIcon} tint="purple" label="Paid to creators" value={money.payouts.text} sample={money.payouts.sample} desc="Total creator earnings paid out so far." foot="View withdrawals" />
          <Kpi href="/admin/payments" icon={CreditCardIcon} tint="pink" label="Refunds" value={money.refunds.text} sample={money.refunds.sample} desc="Money returned to brands on cancelled or disputed work." foot="View refunds" />
        </div>
      </section>

      <section>
        <div className="adm-section-title">
          <h2>Platform</h2>
          <span>Accounts and campaign activity</span>
        </div>
        <div className="adm-kpis">
          <Kpi href="/admin/brands" icon={BuildingIcon} tint="blue" label="Brands" value={platform.brands.text} sample={platform.brands.sample} desc="Registered brand accounts." foot="View brands" />
          <Kpi href="/admin/creators" icon={UsersIcon} tint="purple" label="Creators" value={platform.creators.text} sample={platform.creators.sample} desc="Registered creator accounts." foot="View creators" />
          <Kpi href="/admin/campaigns" icon={MegaphoneIcon} tint="green" label="Live campaigns" value={platform.live.text} sample={platform.live.sample} desc={`Out of ${platform.campaigns.text} campaigns created in total.`} foot="View live campaigns" />
          <Kpi href="/admin/campaigns" icon={CheckCircleIcon} tint="amber" label="Completed campaigns" value={platform.completed.text} sample={platform.completed.sample} desc={`${platform.payments.text} brand payments processed.`} foot="View campaigns" />
        </div>
      </section>

      <section className="adm-grid-2">
        <div className="adm-panel">
          <div className="adm-panel-head">
            <h3>Latest campaign submissions</h3>
            <Link href="/admin/campaigns">View all</Link>
          </div>
          {!latestReviews.items ? (
            <p className="adm-panel-empty">{lists.campaigns === "error" ? noAccessDesc : "Loading…"}</p>
          ) : (
            latestReviews.items.slice(0, 4).map((c) => (
              <div key={c.id} className="adm-panel-row">
                <Avatar name={c.brand.companyName} square />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 650, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
                  <div className="helper-text" style={{ marginTop: 1 }}>
                    {c.brand.companyName} · {c.code} · {formatDate(c.submittedAt)}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.pricingSnapshots[0] ? formatINR(c.pricingSnapshots[0].totalAmount) : "—"}</div>
                  {isDemoId(c.id) ? <DemoTag /> : <StatusBadge status="UNDER_REVIEW" label="Awaiting review" />}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="adm-panel">
          <div className="adm-panel-head">
            <h3>Latest withdrawal requests</h3>
            <Link href="/admin/withdrawals">View all</Link>
          </div>
          {!latestWithdrawals.items ? (
            <p className="adm-panel-empty">{lists.withdrawals === "error" ? noAccessDesc : "Loading…"}</p>
          ) : (
            latestWithdrawals.items.slice(0, 4).map((w) => (
              <div key={w.id} className="adm-panel-row">
                <Avatar name={w.creator.fullName} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 650, fontSize: 14 }}>{w.creator.fullName}</div>
                  <div className="helper-text" style={{ marginTop: 1 }}>
                    @{w.creator.displayName} · {formatDate(w.requestedAt)}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{formatINR(w.amount)}</div>
                  {isDemoId(w.id) ? <DemoTag /> : <StatusBadge status={w.status} />}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
