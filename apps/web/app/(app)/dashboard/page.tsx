"use client";

import { useEffect, useState, type SVGProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { Button } from "@/components/Button";
import { InstagramConnect } from "@/components/InstagramConnect";
import { PageLoader } from "@/components/PageLoader";
import { StatCard } from "@/components/StatCard";
import {
  CalendarIcon,
  CheckCircleIcon,
  ChatIcon,
  DownloadIcon,
  GearIcon,
  GiftIcon,
  HandshakeIcon,
  InstagramIcon,
  MegaphoneIcon,
  TargetIcon,
  TrendingUpIcon,
  UserIcon,
  WalletIcon,
} from "@/components/icons";

interface Me {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  brand: { companyName: string } | null;
  creator: { displayName: string } | null;
}

interface Wallet {
  availableBalance: string;
  reservedBalance: string;
}

interface Campaign {
  id: string;
  code: string;
  title: string;
  status: string;
  createdAt: string;
  pricingSnapshots: Array<{ totalAmount: string }>;
}

interface Assignment {
  id: string;
  status: string;
  payoutAmount: string;
  campaign: { title: string };
}

interface Offer {
  id: string;
  status: string;
  campaign: { title: string };
}

interface WalletTx {
  type: string;
  amount: string;
  createdAt: string;
}

const LIVE_STATUSES = new Set(["LIVE", "MATCHING", "IN_PROGRESS"]);
const SPENT_STATUSES = new Set(["PAID", "LIVE", "MATCHING", "IN_PROGRESS", "COMPLETED"]);

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: (props: SVGProps<SVGSVGElement>) => JSX.Element }) {
  return (
    <div className="card" style={{ padding: "16px 18px", flex: "1 1 150px", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          borderRadius: 9,
          background: "var(--gradient-brand)",
          flexShrink: 0,
        }}
      >
        <Icon width={17} height={17} stroke="#fff" />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="helper-text" style={{ marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 21, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}

function ShortcutCard({ icon: Icon, title, description, href, linkLabel }: {
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="card" style={{ maxWidth: 360, flex: "1 1 280px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "var(--color-primary-soft)",
            flexShrink: 0,
          }}
        >
          <Icon width={16} height={16} stroke="var(--color-primary)" />
        </span>
        <h3 style={{ margin: 0 }}>{title}</h3>
      </div>
      <p className="helper-text" style={{ marginBottom: 12 }}>{description}</p>
      <Link href={href} style={{ color: "var(--color-primary)", fontWeight: 600 }}>
        {linkLabel} →
      </Link>
    </div>
  );
}

/** Creator dashboard only: a plain-English "what happened recently"
 * feed, built by merging the few real, already-fetched sources that
 * actually change over time (offers, deals, wallet transactions) —
 * there's no dedicated activity-log endpoint for creators, so this is
 * assembled client-side rather than left as permanently-empty
 * decoration or, worse, filled with invented events. */
function useRecentActivity(offers: Offer[] | null, assignments: Assignment[] | null, walletTx: WalletTx[] | null) {
  if (!offers || !assignments || !walletTx) return null;
  const items: Array<{ id: string; text: string; date: string }> = [];
  for (const o of offers) {
    if (o.status !== "OFFERED") continue;
    items.push({ id: `offer-${o.id}`, text: `New offer: ${o.campaign.title}`, date: "" });
  }
  for (const a of assignments) {
    if (a.status === "PAID") items.push({ id: `paid-${a.id}`, text: `Paid for ${a.campaign.title}`, date: "" });
  }
  for (const t of walletTx.slice(0, 5)) {
    if (t.type === "CREATOR_EARNING") {
      items.push({ id: `earn-${t.createdAt}`, text: `Earned ₹${t.amount}`, date: new Date(t.createdAt).toLocaleDateString() });
    }
  }
  return items.slice(0, 6);
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [walletTx, setWalletTx] = useState<WalletTx[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Me>("/api/auth/me")
      .then((m) => {
        setMe(m);
        if (m.brand) {
          apiFetch<Campaign[]>("/api/campaigns").then(setCampaigns).catch(() => setCampaigns([]));
        } else {
          apiFetch<Assignment[]>("/api/assignments").then(setAssignments).catch(() => setAssignments([]));
          apiFetch<WalletTx[]>("/api/wallet/transactions").then(setWalletTx).catch(() => setWalletTx([]));
          apiFetch<Offer[]>("/api/campaign-offers").then(setOffers).catch(() => setOffers([]));
        }
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load your account."));
  }, []);

  useEffect(() => {
    apiFetch<Wallet>("/api/wallet").catch(() => null).then((w) => w && setWallet(w));
  }, []);

  const recentActivity = useRecentActivity(offers, assignments, walletTx);

  if (error) {
    return (
      <main style={{ padding: "32px" }}>
        <p className="error-text">{error}</p>
      </main>
    );
  }

  if (!me) {
    return <PageLoader />;
  }

  const accountType = me.brand ? "BRAND" : "CREATOR";
  const today = new Date();
  // Local time of day, not a fixed string — this rendered "Good morning" at night.
  const hour = today.getHours();
  const greeting = hour >= 5 && hour < 12 ? "Good morning" : hour >= 12 && hour < 17 ? "Good afternoon" : "Good evening";

  const totalSpend = campaigns
    ?.filter((c) => SPENT_STATUSES.has(c.status))
    .reduce((sum, c) => sum + Number(c.pricingSnapshots[0]?.totalAmount ?? 0), 0);

  const paidAssignments = assignments?.filter((a) => a.status === "PAID") ?? [];
  const completionRate = assignments && assignments.length > 0 ? Math.round((paidAssignments.length / assignments.length) * 100) : null;
  const lifetimeEarnings = walletTx
    ? walletTx.reduce((sum, t) => sum + (t.type === "CREATOR_EARNING" ? Number(t.amount) : t.type === "FEE" ? -Number(t.amount) : 0), 0)
    : null;
  const pendingOffers = offers?.filter((o) => o.status === "OFFERED" || o.status === "VIEWED").length ?? 0;

  if (accountType === "BRAND") {
    const recentCampaigns = campaigns
      ? [...campaigns].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 5)
      : null;

    return (
      <main style={{ padding: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <h1>{greeting}, {me.brand?.companyName ?? me.name ?? me.email} 👋</h1>
            <p className="helper-text" style={{ marginTop: -8, fontSize: 14.5 }}>Here&apos;s what&apos;s happening with your campaigns today.</p>
          </div>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
            <span className="icon-badge icon-badge-blue" aria-hidden="true">
              <CalendarIcon width={16} height={16} />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                {today.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
              </div>
              <div className="helper-text">Let&apos;s create something amazing today!</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <StatCard
            icon={MegaphoneIcon}
            tint="purple"
            label="Total Campaigns"
            href="/campaigns"
            value={campaigns ? campaigns.length : "—"}
            trend="+0% from last month"
          />
          <StatCard
            icon={TargetIcon}
            tint="green"
            label="Active Now"
            href="/campaigns"
            value={campaigns ? campaigns.filter((c) => LIVE_STATUSES.has(c.status)).length : "—"}
            trend="+0% from last month"
          />
          <StatCard
            icon={CheckCircleIcon}
            tint="blue"
            label="Completed"
            href="/campaigns"
            value={campaigns ? campaigns.filter((c) => c.status === "COMPLETED").length : "—"}
            trend="+0% from last month"
          />
          <StatCard
            icon={WalletIcon}
            tint="pink"
            label="Total Spend"
            href="/wallet"
            value={totalSpend != null ? `₹${totalSpend.toLocaleString("en-IN")}` : "—"}
            trend="+0% from last month"
          />
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <div className="card" style={{ flex: "1 1 280px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span className="icon-badge icon-badge-blue" aria-hidden="true">
                <WalletIcon width={17} height={17} />
              </span>
              <h3 style={{ margin: 0 }}>Wallet</h3>
            </div>
            <p className="helper-text" style={{ margin: "4px 0 16px" }}>Manage your balance and payments.</p>
            {wallet ? (
              <>
                <p style={{ margin: "2px 0 4px", fontSize: 22, fontWeight: 750 }}>₹{Number(wallet.availableBalance).toFixed(2)}</p>
                <p style={{ margin: "0 0 16px", color: "var(--color-text-secondary)", fontSize: 13 }}>Reserved: ₹{wallet.reservedBalance}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="secondary" onClick={() => router.push("/wallet")}>View Transactions</Button>
                  <Button onClick={() => router.push("/wallet")}>Add Funds</Button>
                </div>
              </>
            ) : (
              <p className="helper-text">No wallet yet.</p>
            )}
          </div>

        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div className="card" style={{ flex: "2 1 420px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="icon-badge icon-badge-blue" aria-hidden="true">
                  <MegaphoneIcon width={17} height={17} />
                </span>
                <h3 style={{ margin: 0 }}>Recent Campaigns</h3>
              </div>
              <Link href="/campaigns" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)" }}>
                View all →
              </Link>
            </div>
            <p className="helper-text" style={{ margin: "4px 0 16px" }}>Your latest campaign activity.</p>
            {!recentCampaigns ? (
              <PageLoader />
            ) : recentCampaigns.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center" }}>
                <span className="icon-badge icon-badge-purple" style={{ margin: "0 auto 12px" }} aria-hidden="true">
                  <MegaphoneIcon width={18} height={18} />
                </span>
                <p style={{ margin: 0, fontWeight: 600 }}>No campaigns yet</p>
                <p className="helper-text" style={{ marginTop: 4, marginBottom: 16 }}>Create your first campaign to get started.</p>
                <Button onClick={() => router.push("/campaigns")}>+ Create Campaign</Button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {recentCampaigns.map((c) => (
                  <Link
                    key={c.id}
                    href={`/campaigns/${c.id}`}
                    style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-border)", color: "var(--color-text)", textDecoration: "none" }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{c.title ?? c.code}</span>
                    <span className="helper-text">{c.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ flex: "1 1 280px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span className="icon-badge icon-badge-amber" aria-hidden="true">
                <TargetIcon width={17} height={17} />
              </span>
              <h3 style={{ margin: 0 }}>Quick Actions</h3>
            </div>
            <p className="helper-text" style={{ margin: "4px 0 16px" }}>Everything you need, one click away.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { icon: MegaphoneIcon, tint: "purple" as const, title: "Create Campaign", desc: "Launch a new campaign", href: "/campaigns" },
                { icon: UserIcon, tint: "blue" as const, title: "Find Creators", desc: "Browse top creators", href: "/creators" },
                { icon: ChatIcon, tint: "green" as const, title: "Check Messages", desc: "View your conversations", href: "/messages" },
                { icon: TrendingUpIcon, tint: "amber" as const, title: "View Analytics", desc: "Track campaign performance", href: "/analytics" },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="card card-interactive"
                  style={{ padding: 12, textDecoration: "none", color: "var(--color-text)" }}
                >
                  <span className={`icon-badge icon-badge-${a.tint}`} aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 9, marginBottom: 8 }}>
                    <a.icon width={15} height={15} />
                  </span>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{a.title}</div>
                  <div className="helper-text" style={{ fontSize: 11.5 }}>{a.desc}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: "32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1>{greeting}, {me.creator?.displayName ?? me.name ?? me.email} 👋</h1>
          <p className="helper-text" style={{ marginTop: -8, fontSize: 14.5 }}>Ready to create something amazing today?</p>
        </div>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
          <span className="icon-badge icon-badge-blue" aria-hidden="true">
            <CalendarIcon width={16} height={16} />
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>
              {today.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
            </div>
            <div className="helper-text">Consistency creates opportunities.</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard
          icon={HandshakeIcon}
          tint="purple"
          label="Active deals"
          href="/deals"
          value={assignments ? assignments.filter((a) => a.status !== "PAID").length : "—"}
          trend="+0% from last month"
        />
        <StatCard
          icon={CheckCircleIcon}
          tint="blue"
          label="Completed"
          href="/deals"
          value={paidAssignments.length}
          trend="+0% from last month"
        />
        <StatCard
          icon={TargetIcon}
          tint="green"
          label="Completion rate"
          value={completionRate != null ? `${completionRate}%` : "—"}
          trend={completionRate == null ? "No data yet" : "+0% from last month"}
        />
        <StatCard
          icon={WalletIcon}
          tint="pink"
          label="Lifetime earnings"
          href="/wallet"
          value={lifetimeEarnings != null ? `₹${lifetimeEarnings.toLocaleString("en-IN")}` : "—"}
          trend="+0% from last month"
        />
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div className="card" style={{ flex: "1 1 280px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="icon-badge icon-badge-blue" aria-hidden="true">
                <WalletIcon width={17} height={17} />
              </span>
              <h3 style={{ margin: 0 }}>Wallet</h3>
            </div>
            <Link href="/wallet" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)" }}>
              View all →
            </Link>
          </div>
          {wallet ? (
            <>
              <p className="helper-text" style={{ marginTop: 12, marginBottom: 0 }}>Available balance</p>
              <p style={{ margin: "2px 0 4px", fontSize: 22, fontWeight: 750 }}>₹{Number(wallet.availableBalance).toFixed(2)}</p>
              <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: 13 }}>Reserved: ₹{wallet.reservedBalance}</p>
            </>
          ) : (
            <p className="helper-text">No wallet yet.</p>
          )}
        </div>

        <InstagramConnect />

        <div className="card" style={{ flex: "1 1 280px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="icon-badge icon-badge-amber" aria-hidden="true">
                <GiftIcon width={17} height={17} />
              </span>
              <h3 style={{ margin: 0 }}>Offers</h3>
            </div>
            <Link href="/offers" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)" }}>
              View all →
            </Link>
          </div>
          <p className="helper-text" style={{ margin: "4px 0 16px" }}>See campaign offers waiting for you.</p>
          {pendingOffers > 0 ? (
            <p style={{ margin: 0, fontSize: 14 }}>
              You have <strong>{pendingOffers}</strong> offer{pendingOffers === 1 ? "" : "s"} waiting.
            </p>
          ) : (
            <p className="helper-text" style={{ margin: 0 }}>No new offers right now. We&apos;ll notify you when new offers arrive.</p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div className="card" style={{ flex: "2 1 420px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="icon-badge icon-badge-purple" aria-hidden="true">
                <CalendarIcon width={17} height={17} />
              </span>
              <h3 style={{ margin: 0 }}>Recent Activity</h3>
            </div>
          </div>
          <p className="helper-text" style={{ margin: "4px 0 16px" }}>Your latest actions and updates.</p>
          {!recentActivity ? (
            <PageLoader />
          ) : recentActivity.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center" }}>
              <span className="icon-badge icon-badge-purple" style={{ margin: "0 auto 12px" }} aria-hidden="true">
                <DownloadIcon width={18} height={18} />
              </span>
              <p style={{ margin: 0, fontWeight: 600 }}>No recent activity</p>
              <p className="helper-text" style={{ marginTop: 4 }}>Your activity will appear here once you start working on campaigns.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {recentActivity.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
                  <span style={{ fontSize: 13.5 }}>{item.text}</span>
                  {item.date && <span className="helper-text">{item.date}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ flex: "1 1 280px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span className="icon-badge icon-badge-amber" aria-hidden="true">
              <TargetIcon width={17} height={17} />
            </span>
            <h3 style={{ margin: 0 }}>Quick Actions</h3>
          </div>
          <p className="helper-text" style={{ margin: "4px 0 16px" }}>Everything you need, one click away.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { icon: UserIcon, tint: "purple" as const, title: "Complete Profile", desc: "Get matched faster", href: "/profile" },
              { icon: HandshakeIcon, tint: "amber" as const, title: "My Deals", desc: "Track accepted deals", href: "/deals" },
              { icon: ChatIcon, tint: "blue" as const, title: "Check Messages", desc: "View conversations", href: "/messages" },
              { icon: GearIcon, tint: "green" as const, title: "Settings", desc: "Account & preferences", href: "/settings" },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="card card-interactive"
                style={{ padding: 12, textDecoration: "none", color: "var(--color-text)" }}
              >
                <span className={`icon-badge icon-badge-${a.tint}`} aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 9, marginBottom: 8 }}>
                  <a.icon width={15} height={15} />
                </span>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{a.title}</div>
                <div className="helper-text" style={{ fontSize: 11.5 }}>{a.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
