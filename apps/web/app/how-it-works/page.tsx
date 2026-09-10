import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

const brandSteps = ["Create a campaign (type, brief, targeting, budget)", "Admin reviews and approves it", "Pay — funds are reserved", "Eligible creators are matched and offered the campaign", "Review submitted content and verification", "Campaign completes; evidence is archived"];
const creatorSteps = ["Complete your profile and connect Instagram", "Receive campaign offers matched to your audience", "Review terms and accept", "Create and submit your content (or ship details for Product Review)", "Get verified, pass retention where applicable", "Get paid to your wallet and withdraw via UPI"];

function StepList({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="card" style={{ padding: 28 }}>
      <h2 style={{ fontSize: 20, marginBottom: 18 }}>{title}</h2>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
        {steps.map((s, i) => (
          <li key={s} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <span
              style={{
                flexShrink: 0,
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "var(--color-primary-soft)",
                color: "var(--color-primary)",
                fontWeight: 700,
                fontSize: 12.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {i + 1}
            </span>
            <span style={{ fontSize: 14.5, lineHeight: 1.55, paddingTop: 3 }}>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "64px 24px 88px", maxWidth: 920 }}>
        <span className="eyebrow" style={{ marginBottom: 16 }}>How it works</span>
        <h1 style={{ marginTop: 12, maxWidth: 640 }}>Every step is real, working platform — not a mockup.</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 40, fontSize: 16, maxWidth: 560 }}>
          Two sides, one pipeline: here's exactly what happens after a brand hits create, and after a creator hits accept.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 22 }}>
          <StepList title="For Brands" steps={brandSteps} />
          <StepList title="For Creators" steps={creatorSteps} />
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
