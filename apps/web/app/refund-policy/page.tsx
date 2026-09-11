import type { Metadata } from "next";
import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "How refunds work on Vidlix.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "64px 24px 96px", maxWidth: 760 }}>
        <span className="eyebrow" style={{ marginBottom: 16 }}>Legal</span>
        <h1 style={{ marginTop: 12 }}>Refund Policy</h1>

        <div className="card" style={{ marginBottom: 32, background: "var(--color-warning-soft)" }}>
          <strong>This is an early, working draft.</strong> It describes how refunds actually work on the platform
          today. It has not yet been reviewed by qualified legal counsel.
        </div>

        <div className="card" style={{ padding: 28 }}>
          <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: 15, lineHeight: 1.7 }}>
            Refunds are issued by platform admins against a specific payment, in full or in part, and processed
            through the original payment provider. They are typically considered when a campaign is cancelled before
            matching, or as the outcome of a dispute decision. A refund reduces the brand's reserved balance for
            that campaign; it does not affect any payout a creator has already received for completed work.
          </p>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
