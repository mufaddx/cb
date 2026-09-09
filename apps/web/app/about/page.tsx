import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

export default function AboutPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "56px 24px", maxWidth: 720 }}>
        <h1>About Antigravity</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 16 }}>
          Antigravity connects brands with creators for clipping, creator content, and product review campaigns —
          with matching, verification, retention tracking, and payouts handled end to end on one platform.
        </p>
      </section>
      <MarketingFooter />
    </main>
  );
}
