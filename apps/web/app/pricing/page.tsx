import type { Metadata } from "next";
import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

export const metadata: Metadata = {
  title: "Pricing",
  description: "How campaign pricing works on Vidlix — creator payout, platform fee, and tax, computed from the live rate card before your campaign goes live.",
  alternates: { canonical: "/pricing" },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

const BREAKDOWN = [
  { label: "Creator payout subtotal", detail: "Calculated from the platform's rate card for your chosen targeting." },
  { label: "Platform fee", detail: "A single, transparent fee added on top of the payout subtotal." },
  { label: "Tax", detail: "GST at the rate active when your campaign is created." },
  { label: "Total due", detail: "What you actually pay before your campaign goes live." },
];

export default function PricingPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "64px 24px 96px", maxWidth: 800 }}>
        <span className="eyebrow" style={{ marginBottom: 16 }}>Pricing</span>
        <h1 style={{ marginTop: 12, maxWidth: 640 }}>One transparent breakdown, every time you pay.</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 40, fontSize: 17, maxWidth: 600 }}>
          Creator payouts follow a rate card tied to follower count and reach, so there is no single public price
          list that would apply to every campaign. A platform fee and applicable tax are added on top, and shown in
          full before you pay for anything.
        </p>

        <div className="card" style={{ padding: 32, marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, marginBottom: 18 }}>What you see before you pay</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {BREAKDOWN.map((row, i) => (
              <div key={row.label} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span
                  style={{
                    flexShrink: 0,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "var(--color-primary-soft)",
                    color: "var(--color-primary)",
                    fontWeight: 700,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {i + 1}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{row.label}</div>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: 13.5 }}>{row.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-interactive" style={{ padding: 28, textAlign: "center" }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>See your exact numbers</h3>
          <p className="helper-text" style={{ marginBottom: 20 }}>
            Start a campaign draft and the full breakdown is computed live from the current rate card for your
            targeting, never estimated.
          </p>
          <a
            href={`${APP_URL}/signup?as=brand`}
            style={{
              display: "inline-block",
              background: "var(--color-text)",
              color: "var(--color-white)",
              padding: "12px 22px",
              borderRadius: "var(--radius-control)",
              fontWeight: 600,
              fontSize: 14.5,
            }}
          >
            Start a Campaign
          </a>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
