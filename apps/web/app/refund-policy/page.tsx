import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

export default function RefundPolicyPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "56px 24px", maxWidth: 720 }}>
        <h1>Refund Policy</h1>
        <div className="card" style={{ marginBottom: 24, background: "#FFFBEB", borderColor: "var(--color-warning)" }}>
          <strong>Draft — not legal advice.</strong> Describes how refunds actually work on the platform today; not
          reviewed by legal counsel (spec §38).
        </div>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Refunds are issued by platform admins against a specific payment — in full or in part — and processed
          through the original payment provider. They're typically considered when a campaign is cancelled before
          matching, or as the outcome of a dispute decision. A refund reduces the brand's reserved balance for that
          campaign; it does not automatically affect any payout a creator has already received for completed work.
        </p>
      </section>
      <MarketingFooter />
    </main>
  );
}
