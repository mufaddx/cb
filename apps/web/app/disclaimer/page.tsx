import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

export default function DisclaimerPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "64px 24px 96px", maxWidth: 760 }}>
        <span className="eyebrow" style={{ marginBottom: 16 }}>Legal</span>
        <h1 style={{ marginTop: 12 }}>Disclaimer</h1>

        <div className="card" style={{ marginBottom: 32, background: "var(--color-warning-soft)", borderColor: "#f2d49a" }}>
          <strong>This is an early, working draft.</strong> It has not yet been reviewed by qualified legal counsel.
        </div>

        <div className="card" style={{ padding: 28 }}>
          <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: 15, lineHeight: 1.7 }}>
            Creators are responsible for disclosing material connections, such as marking a post as sponsored,
            wherever applicable advertising standards require it for a campaign. Tax treatment shown in campaign
            pricing, including GST and TDS, is configured from the platform's rate card and should be confirmed
            with a qualified tax professional before you rely on it for compliance.
          </p>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
