import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

export default function ContactPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "56px 24px", maxWidth: 560 }}>
        <h1>Contact</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 16 }}>
          Already have an account? Use the Deal Room on any campaign, or Support from your dashboard, for the
          fastest response — those messages are tied to your account and campaign context.
        </p>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Otherwise, reach us through the contact details provided when you signed up for access.
        </p>
      </section>
      <MarketingFooter />
    </main>
  );
}
