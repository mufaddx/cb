import type { Metadata } from "next";
import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";
import { HandshakeIcon, MegaphoneIcon } from "../../components/icons";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Vidlix — support for brands and creators.",
  alternates: { canonical: "/contact" },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

export default function ContactPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "64px 24px 96px", maxWidth: 760 }}>
        <span className="eyebrow" style={{ marginBottom: 16 }}>Contact</span>
        <h1 style={{ marginTop: 12, maxWidth: 560 }}>The fastest way to reach us depends on where you are.</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 40, fontSize: 17, maxWidth: 580 }}>
          Support tied to your account gets you a faster, more useful answer than a general inbox, since it already
          carries your campaign's context.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          <div className="card" style={{ padding: 28 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 11,
                background: "var(--gradient-brand)",
                marginBottom: 16,
              }}
            >
              <HandshakeIcon width={20} height={20} stroke="#fff" />
            </div>
            <h3 style={{ fontSize: 16.5, marginBottom: 8 }}>Already have an account</h3>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14.5, lineHeight: 1.6, marginBottom: 20 }}>
              Open the Deal Room on the relevant campaign and message us there. It's tied to your account and that
              campaign already, so we can help without you repeating any context.
            </p>
            <a href={`${APP_URL}/login`} style={{ fontWeight: 600, fontSize: 14 }}>
              Go to your dashboard →
            </a>
          </div>

          <div className="card" style={{ padding: 28 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 11,
                background: "var(--color-dark)",
                marginBottom: 16,
              }}
            >
              <MegaphoneIcon width={20} height={20} stroke="#fff" />
            </div>
            <h3 style={{ fontSize: 16.5, marginBottom: 8 }}>Not a member yet</h3>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14.5, lineHeight: 1.6, marginBottom: 20 }}>
              Create an account as a brand or a creator, and you will land in a dashboard with a direct line to
              support from the start.
            </p>
            <a href={`${APP_URL}/signup`} style={{ fontWeight: 600, fontSize: 14 }}>
              Create an account →
            </a>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
