import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

const SECTIONS = [
  {
    title: "Campaign agreements",
    body: "Accepting a campaign offer generates a specific agreement covering payout, deliverables, retention, and usage rights for that assignment. Every acceptance is timestamped and recorded against the account that accepted it.",
  },
  {
    title: "Payments",
    body: "Brand payments are confirmed only through the payment provider's signed confirmation. Creator payouts are released after verification, and after any retention period where one applies, and held in your platform wallet until you withdraw them.",
  },
  {
    title: "Disputes",
    body: "Either party may open a dispute on a campaign through its Deal Room. Platform admins review the evidence and record a decision; any financial consequence is handled separately through the refund process.",
  },
];

export default function TermsPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "64px 24px 96px", maxWidth: 760 }}>
        <span className="eyebrow" style={{ marginBottom: 16 }}>Legal</span>
        <h1 style={{ marginTop: 12 }}>Terms of Service</h1>

        <div className="card" style={{ marginBottom: 32, background: "var(--color-warning-soft)", borderColor: "#f2d49a" }}>
          <strong>This is an early, working draft.</strong> It describes how the platform actually behaves today. It
          has not yet been reviewed by qualified legal counsel, and accepting it does not claim to create an
          automatically enforceable contract until it has been.
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
