import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

export default function TermsPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "56px 24px", maxWidth: 720 }}>
        <h1>Terms of Service</h1>
        <div className="card" style={{ marginBottom: 24, background: "#FFFBEB", borderColor: "var(--color-warning)" }}>
          <strong>Draft — not legal advice.</strong> These terms describe how the platform actually behaves. They
          have not been reviewed by qualified legal counsel and are not a substitute for reviewed, binding terms
          (spec §38). A checkbox click here is not claimed to be automatically, unconditionally enforceable.
        </div>
        <h3>Campaign agreements</h3>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Accepting a campaign offer generates a specific agreement covering payout, deliverables, retention, and
          usage rights for that assignment. Every acceptance is timestamped and recorded against the account that
          accepted it.
        </p>
        <h3>Payments</h3>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Brand payments are confirmed only via the payment provider's signed webhook. Creator payouts are released
          after verification (and retention, where applicable) and held in an in-platform wallet until withdrawn.
        </p>
        <h3>Disputes</h3>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Either party may open a dispute on a campaign through the Deal Room. Platform admins review evidence and
          record a decision; financial consequences, if any, go through the refund process separately.
        </p>
      </section>
      <MarketingFooter />
    </main>
  );
}
