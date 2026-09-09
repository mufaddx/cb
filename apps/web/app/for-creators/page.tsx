import Link from "next/link";
import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

const points = [
  { title: "Connect Instagram", description: "Official OAuth connection — we never ask for your password." },
  { title: "Find opportunities", description: "Receive offers matched to your follower count or reach." },
  { title: "Accept", description: "Review terms — payout, retention, usage rights — before accepting." },
  { title: "Create", description: "Post, submit content, or receive and review a product, depending on the campaign." },
  { title: "Get verified", description: "Automated and manual checks confirm your submission meets requirements." },
  { title: "Earn", description: "Payouts land in your wallet; withdraw to UPI once KYC is verified." },
];

export default function ForCreatorsPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "56px 24px", maxWidth: 880 }}>
        <h1>For Creators</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 32, fontSize: 16 }}>
          Get matched to real brand campaigns and get paid — with every step tracked and verifiable.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
          {points.map((p) => (
            <div key={p.title} className="card">
              <h3 style={{ fontSize: 16 }}>{p.title}</h3>
              <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: 14 }}>{p.description}</p>
            </div>
          ))}
        </div>
        <Link href="/signup?as=creator" style={{ background: "var(--color-primary)", color: "var(--color-white)", padding: "12px 22px", borderRadius: "var(--radius-control)", fontWeight: 600 }}>
          Join as a Creator
        </Link>
      </section>
      <MarketingFooter />
    </main>
  );
}
