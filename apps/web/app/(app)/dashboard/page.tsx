"use client";

import { useEffect, useState, type SVGProps } from "react";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { InstagramConnect } from "@/components/InstagramConnect";
import { PageLoader } from "@/components/PageLoader";
import {
  CheckCircleIcon,
  HandshakeIcon,
  MegaphoneIcon,
  TargetIcon,
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
  status: string;
  pricingSnapshots: Array<{ totalAmount: string }>;
}

interface Assignment {
  status: string;
  payoutAmount: string;
}

interface WalletTx {
  type: string;
  amount: string;
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

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
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
        }
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load your account."));
  }, []);

  useEffect(() => {
    apiFetch<Wallet>("/api/wallet").catch(() => null).then((w) => w && setWallet(w));
  }, []);

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

  const totalSpend = campaigns
    ?.filter((c) => SPENT_STATUSES.has(c.status))
    .reduce((sum, c) => sum + Number(c.pricingSnapshots[0]?.totalAmount ?? 0), 0);

  const paidAssignments = assignments?.filter((a) => a.status === "PAID") ?? [];
  const completionRate = assignments && assignments.length > 0 ? Math.round((paidAssignments.length / assignments.length) * 100) : null;
  const lifetimeEarnings = walletTx
    ? walletTx.reduce((sum, t) => sum + (t.type === "CREATOR_EARNING" ? Number(t.amount) : t.type === "FEE" ? -Number(t.amount) : 0), 0)
    : null;

  return (
    <>
      <main style={{ padding: "32px" }}>
        <h1>Good morning, {me.brand?.companyName ?? me.creator?.displayName ?? me.name ?? me.email}</h1>

        {accountType === "BRAND" ? (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "20px 0" }}>
            <Stat icon={MegaphoneIcon} label="Total campaigns" value={campaigns ? String(campaigns.length) : "—"} />
            <Stat icon={TargetIcon} label="Active now" value={campaigns ? String(campaigns.filter((c) => LIVE_STATUSES.has(c.status)).length) : "—"} />
            <Stat icon={CheckCircleIcon} label="Completed" value={campaigns ? String(campaigns.filter((c) => c.status === "COMPLETED").length) : "—"} />
            <Stat icon={WalletIcon} label="Total spend" value={totalSpend != null ? `₹${totalSpend.toLocaleString("en-IN")}` : "—"} />
          </div>
        ) : (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "20px 0" }}>
            <Stat icon={HandshakeIcon} label="Active deals" value={assignments ? String(assignments.filter((a) => a.status !== "PAID").length) : "—"} />
            <Stat icon={CheckCircleIcon} label="Completed" value={String(paidAssignments.length)} />
            <Stat icon={TargetIcon} label="Completion rate" value={completionRate != null ? `${completionRate}%` : "—"} />
            <Stat icon={WalletIcon} label="Lifetime earnings" value={lifetimeEarnings != null ? `₹${lifetimeEarnings.toLocaleString("en-IN")}` : "—"} />
          </div>
        )}

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div className="card" style={{ maxWidth: 360, flex: "1 1 280px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span
                aria-hidden="true"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, background: "var(--color-primary-soft)", flexShrink: 0 }}
              >
                <WalletIcon width={16} height={16} stroke="var(--color-primary)" />
              </span>
              <h3 style={{ margin: 0 }}>Wallet</h3>
            </div>
            {wallet ? (
              <>
                <p style={{ margin: "4px 0" }}>Available: ₹{wallet.availableBalance}</p>
                <p style={{ margin: "4px 0", color: "var(--color-text-secondary)" }}>Reserved: ₹{wallet.reservedBalance}</p>
              </>
            ) : (
              <p className="helper-text">No wallet yet.</p>
            )}
          </div>
          {accountType === "BRAND" ? (
            <ShortcutCard icon={MegaphoneIcon} title="Campaigns" description="Launch and manage your campaigns." href="/campaigns" linkLabel="View campaigns" />
          ) : (
            <>
              <InstagramConnect />
              <ShortcutCard icon={TargetIcon} title="Offers" description="See campaign offers waiting for you." href="/offers" linkLabel="View offers" />
            </>
          )}
        </div>
      </main>
    </>
  );
}
