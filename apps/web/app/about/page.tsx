import type { Metadata } from "next";
import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

export const metadata: Metadata = {
  title: "About",
  description:
    "Vidlix connects brands with creators for clipping and creator content campaigns, with matching, verification, retention tracking, and payouts handled end to end.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "64px 24px 72px", maxWidth: 720 }}>
        <span className="eyebrow" style={{ marginBottom: 18 }}>About Vidlix</span>
        <h1 style={{ marginTop: 4 }}>Built for the campaign, not the spreadsheet.</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 17, lineHeight: 1.7 }}>
          Vidlix connects brands with creators for clipping, creator content, and product review campaigns —
          with matching, verification, retention tracking, and payouts handled end to end on one platform.
          No DMs to track, no spreadsheets to reconcile, no manual payout chasing — just a campaign that runs
          itself from brief to payout.
        </p>
      </section>
      <MarketingFooter />
    </main>
  );
}
