import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

export default function DisclaimerPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "56px 24px", maxWidth: 720 }}>
        <h1>Disclaimer</h1>
        <div className="card" style={{ marginBottom: 24, background: "#FFFBEB", borderColor: "var(--color-warning)" }}>
          <strong>Draft — not legal advice.</strong> Not reviewed by qualified legal counsel (spec §38).
        </div>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Creators are responsible for disclosing material connections (e.g. #ad) as required by applicable
          advertising standards when a campaign requires disclosure. Tax treatment (GST/TDS) shown in campaign
          pricing is configured in the platform's rate card and should be confirmed with a qualified tax
          professional before relying on it for compliance purposes (spec §63).
        </p>
      </section>
      <MarketingFooter />
    </main>
  );
}
