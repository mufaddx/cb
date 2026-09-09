import Link from "next/link";
import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

const points = [
  { title: "Create", description: "Pick Clipping, Creator Content, or Product Review, and define your brief and targeting." },
  { title: "Target", description: "Set creator eligibility by follower count or average reach." },
  { title: "Fund", description: "Pay through a verified payment flow — funds are reserved, never spent without confirmation." },
  { title: "Match", description: "Eligible creators are automatically matched and offered your campaign." },
  { title: "Review", description: "Approve, request revisions, or reject submitted content from your dashboard." },
  { title: "Measure", description: "Track spend, completion, and campaign progress in real time." },
];

export default function ForBrandsPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "56px 24px", maxWidth: 880 }}>
        <h1>For Brands</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 32, fontSize: 16 }}>
          Launch creator campaigns with real budget controls, matching, and verification — not a spreadsheet of DMs.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
          {points.map((p) => (
            <div key={p.title} className="card">
              <h3 style={{ fontSize: 16 }}>{p.title}</h3>
              <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: 14 }}>{p.description}</p>
            </div>
          ))}
        </div>
        <Link href="/signup?as=brand" style={{ background: "var(--color-primary)", color: "var(--color-white)", padding: "12px 22px", borderRadius: "var(--radius-control)", fontWeight: 600 }}>
          Create a Campaign
        </Link>
      </section>
      <MarketingFooter />
    </main>
  );
}
