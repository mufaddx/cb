import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

export default function PrivacyPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "56px 24px", maxWidth: 720 }}>
        <h1>Privacy Policy</h1>
        <div className="card" style={{ marginBottom: 24, background: "#FFFBEB", borderColor: "var(--color-warning)" }}>
          <strong>Draft — not legal advice.</strong> This page describes the platform's actual data handling in
          plain terms. It has not been reviewed by qualified legal counsel and should not be treated as a binding
          privacy policy until it is (spec §38).
        </div>
        <h3>What we collect</h3>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Account details (email, phone), brand/creator profile information, Instagram profile data via official
          OAuth (never your password), KYC documents (for creators, required before withdrawal), shipping
          addresses (Product Review campaigns), and payment/payout records.
        </p>
        <h3>Who can see what</h3>
        <p style={{ color: "var(--color-text-secondary)" }}>
          KYC data is never visible to brands. Shipping addresses are visible only to the brand and creator on that
          specific assignment, and platform admins. Financial records are visible to you and platform finance
          admins.
        </p>
        <h3>Data retention &amp; deletion</h3>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Financial and audit records are retained as required for dispute resolution and compliance. Contact
          support for data access or deletion requests.
        </p>
      </section>
      <MarketingFooter />
    </main>
  );
}
