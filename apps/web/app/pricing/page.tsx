import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

export default function PricingPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "56px 24px", maxWidth: 720 }}>
        <h1>Pricing</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 24, fontSize: 16 }}>
          Creator payouts are set by a follower/reach-based rate card that the platform maintains — not a fixed
          public price list, since payouts vary by campaign type and targeting range. A platform fee and applicable
          tax (GST) are added on top and shown as a full breakdown before you pay for any campaign.
        </p>
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>What you see before paying</h3>
          <ul style={{ paddingLeft: 20, margin: 0, color: "var(--color-text-secondary)", fontSize: 14 }}>
            <li>Creator payout subtotal, per targeting range</li>
            <li>Platform fee</li>
            <li>Tax (GST, per the active rate at the time of your campaign)</li>
            <li>Total due</li>
          </ul>
        </div>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
          Sign up and start a campaign draft to see exact numbers for your targeting — the breakdown is computed
          live from the platform's current rate card, not estimated.
        </p>
      </section>
      <MarketingFooter />
    </main>
  );
}
