import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

const points = [
  { title: "Connect Instagram", description: "Official OAuth connection — we never ask for your password." },
  { title: "Find opportunities", description: "Receive offers matched to your follower count or reach." },
  { title: "Accept", description: "Review terms — payout, retention, usage rights — before accepting." },
  { title: "Create", description: "Post, submit content, or receive and review a product, depending on the campaign." },
  { title: "Get verified", description: "Automated and manual checks confirm your submission meets requirements." },
  { title: "Earn", description: "Payouts land in your wallet; withdraw to UPI once KYC is verified." },
];

export default function ForCreatorsPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "64px 24px 40px", maxWidth: 920 }}>
        <span className="eyebrow" style={{ marginBottom: 16 }}>For Creators</span>
        <h1 style={{ marginTop: 12, maxWidth: 620 }}>Get matched. Get paid. Get verified.</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 40, fontSize: 17, maxWidth: 560 }}>
          Real brand campaigns, with every step tracked and verifiable — no more chasing a brand for payment.
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
          href={`${APP_URL}/signup?as=creator`}
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
          Join as a Creator →
        </a>
      </section>
      <MarketingFooter />
    </main>
  );
}
