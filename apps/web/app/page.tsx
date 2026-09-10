import { MarketingHeader } from "../components/MarketingHeader";
import { MarketingFooter } from "../components/MarketingFooter";

// Signup lives on the app domain (see middleware.ts) — a plain <a>,
// not next/link, since this page is served from the marketing domain.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

const campaignTypes = [
  { title: "Clipping", description: "Creators re-cut and post brand-supplied video for reach, under defined usage rights." },
  { title: "Creator Content", description: "Creators produce original content to a brief, with revisions and approval built in." },
  { title: "Product Review", description: "Brands ship a physical product; creators review it on receipt." },
];

const steps = [
  { title: "Create", description: "Brand defines a campaign: type, brief, targeting, budget, and usage rights." },
  { title: "Review & Pay", description: "Admin reviews the campaign; the brand pays, and funds are reserved." },
  { title: "Match", description: "Eligible creators receive offers matched to the campaign's targeting." },
  { title: "Deliver", description: "Creators accept, post or ship, and submit proof of delivery." },
  { title: "Verify & Pay Out", description: "Content and retention are verified before payout is released." },
];

export default function HomePage() {
  return (
    <main>
      <MarketingHeader />

      <section className="container" style={{ padding: "72px 24px", textAlign: "center" }}>
        <h1 style={{ maxWidth: 820, margin: "0 auto 20px" }}>Turn Your Campaign Into Creator-Powered Reach.</h1>
        <p style={{ maxWidth: 620, margin: "0 auto 32px", color: "var(--color-text-secondary)", fontSize: 17 }}>
          Brands launch clipping, creator content, and product review campaigns. Creators accept, deliver, and get
          paid — with verification and retention tracked end to end.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <a
            href={`${APP_URL}/signup?as=brand`}
            style={{ background: "var(--color-primary)", color: "var(--color-white)", padding: "14px 24px", borderRadius: "var(--radius-control)", fontWeight: 600 }}
          >
            Create a Campaign
          </a>
          <a
            href={`${APP_URL}/signup?as=creator`}
            style={{ background: "var(--color-white)", border: "1px solid var(--color-border)", padding: "14px 24px", borderRadius: "var(--radius-control)", fontWeight: 600 }}
          >
            Join as a Creator
          </a>
        </div>
      </section>

      <section className="container" style={{ padding: "48px 24px" }}>
        <h2 style={{ textAlign: "center", marginBottom: 32 }}>How It Works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20 }}>
          {steps.map((s, i) => (
            <div key={s.title} className="card">
              <div style={{ color: "var(--color-primary)", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>STEP {i + 1}</div>
              <h3 style={{ fontSize: 17 }}>{s.title}</h3>
              <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: 14 }}>{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="campaign-types" className="container" style={{ padding: "48px 24px" }}>
        <h2 style={{ textAlign: "center", marginBottom: 32 }}>Campaign Types</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {campaignTypes.map((c) => (
            <div key={c.title} className="card">
              <h3>{c.title}</h3>
              <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>{c.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container" style={{ padding: "48px 24px" }}>
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <h2 style={{ marginBottom: 12 }}>Ready to get started?</h2>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <a
              href={`${APP_URL}/signup?as=brand`}
              style={{ background: "var(--color-primary)", color: "var(--color-white)", padding: "12px 22px", borderRadius: "var(--radius-control)", fontWeight: 600 }}
            >
              Create a Campaign
            </a>
            <a
              href={`${APP_URL}/signup?as=creator`}
              style={{ background: "var(--color-white)", border: "1px solid var(--color-border)", padding: "12px 22px", borderRadius: "var(--radius-control)", fontWeight: 600 }}
            >
              Join as a Creator
            </a>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
