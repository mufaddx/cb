import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

const brandSteps = ["Create a campaign (type, brief, targeting, budget)", "Admin reviews and approves it", "Pay — funds are reserved", "Eligible creators are matched and offered the campaign", "Review submitted content and verification", "Campaign completes; evidence is archived"];
const creatorSteps = ["Complete your profile and connect Instagram", "Receive campaign offers matched to your audience", "Review terms and accept", "Create and submit your content (or ship details for Product Review)", "Get verified, pass retention where applicable", "Get paid to your wallet and withdraw via UPI"];

export default function HowItWorksPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "56px 24px", maxWidth: 880 }}>
        <h1>How It Works</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 32 }}>
          Every step below is a real, working part of the platform — not a mockup.
        </p>

        <h2 style={{ fontSize: 22 }}>For Brands</h2>
        <ol style={{ marginBottom: 32, paddingLeft: 20 }}>
          {brandSteps.map((s) => <li key={s} style={{ marginBottom: 8 }}>{s}</li>)}
        </ol>

        <h2 style={{ fontSize: 22 }}>For Creators</h2>
        <ol style={{ paddingLeft: 20 }}>
          {creatorSteps.map((s) => <li key={s} style={{ marginBottom: 8 }}>{s}</li>)}
        </ol>
      </section>
      <MarketingFooter />
    </main>
  );
}
