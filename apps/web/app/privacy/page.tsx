import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

const SECTIONS = [
  {
    title: "What we collect",
    body: "Your account details, your brand or creator profile, your Instagram profile data through an official connection that never sees or stores your password, identity documents for creators before their first withdrawal, shipping addresses for Product Review campaigns, and your payment and payout history.",
  },
  {
    title: "Who can see what",
    body: "Identity documents are never visible to brands. Shipping addresses are visible only to the brand and creator on that specific assignment, and to platform admins. Financial records are visible only to you and to platform finance admins.",
  },
  {
    title: "Retention and deletion",
    body: "Financial and audit records are retained as required for dispute resolution and compliance. To request access to your data or its deletion, contact support.",
  },
];

export default function PrivacyPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "64px 24px 96px", maxWidth: 760 }}>
        <span className="eyebrow" style={{ marginBottom: 16 }}>Legal</span>
        <h1 style={{ marginTop: 12 }}>Privacy Policy</h1>

        <div className="card" style={{ marginBottom: 32, background: "var(--color-warning-soft)", borderColor: "#f2d49a" }}>
          <strong>This is an early, working draft.</strong> It describes how the platform actually handles data
          today, in plain language. It has not yet been reviewed by qualified legal counsel and should not be
          treated as a final, binding policy.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {SECTIONS.map((s) => (
            <div key={s.title} className="card" style={{ padding: 28 }}>
              <h3 style={{ fontSize: 17, marginBottom: 10 }}>{s.title}</h3>
              <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: 15, lineHeight: 1.7 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
