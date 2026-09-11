import type { Metadata } from "next";
import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

export const metadata: Metadata = {
  title: "For Brands",
  description:
    "Launch a Clipping or Creator Content campaign, target by follower count or reach, and let matching, verification, and payouts run themselves.",
  alternates: { canonical: "/for-brands" },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

const points = [
  { title: "Create", description: "Pick Clipping or Creator Content (optionally shipping a product for review), and define your brief and targeting." },
  { title: "Target", description: "Set creator eligibility by follower count or average reach." },
  { title: "Fund", description: "Pay through a verified payment flow — funds are reserved, never spent without confirmation." },
  { title: "Match", description: "Eligible creators are automatically matched and offered your campaign." },
  { title: "Review", description: "Approve, request revisions, or reject submitted content from your dashboard." },
  { title: "Measure", description: "Track spend, completion, and campaign progress in real time." },
];

export default function ForBrandsPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "64px 24px 40px", maxWidth: 920 }}>
        <span className="eyebrow" style={{ marginBottom: 16 }}>For Brands</span>
        <h1 style={{ marginTop: 12, maxWidth: 620 }}>Launch campaigns with real budget controls.</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 40, fontSize: 17, maxWidth: 560 }}>
          Real matching, real verification, real spend tracking — not a spreadsheet of DMs.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 40 }}>
          {points.map((p, i) => (
            <div key={p.title} className="card card-interactive">
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: "var(--color-primary-soft)",
                  color: "var(--color-primary)",
                  fontWeight: 700,
                  fontSize: 12,
                  marginBottom: 12,
                }}
              >
                {i + 1}
              </div>
              <h3 style={{ fontSize: 16 }}>{p.title}</h3>
              <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: 14 }}>{p.description}</p>
            </div>
          ))}
        </div>
        <a
          href={`${APP_URL}/signup?as=brand`}
          style={{
            display: "inline-block",
            background: "var(--color-text)",
            color: "var(--color-white)",
            padding: "14px 24px",
            borderRadius: "var(--radius-control)",
            fontWeight: 600,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          Create a Campaign →
        </a>
      </section>
      <MarketingFooter />
    </main>
  );
}
