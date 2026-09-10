import Link from "next/link";
import { SparkIcon } from "./icons";

// Same reasoning as MarketingHeader: /login and /signup live on the
// app domain, so they need a real cross-origin <a>, not a same-origin
// <Link>. This file previously missed that for its two signup links —
// they'd have 404'd in production on the marketing domain.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

const COLUMNS: Array<{ title: string; links: Array<{ href: string; label: string; external?: boolean }> }> = [
  {
    title: "Platform",
    links: [
      { href: "/how-it-works", label: "How It Works" },
      { href: "/#campaign-types", label: "Campaign Types" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "For Brands",
    links: [
      { href: "/for-brands", label: "For Brands" },
      { href: `${APP_URL}/signup?as=brand`, label: "Create a Campaign", external: true },
    ],
  },
  {
    title: "For Creators",
    links: [
      { href: "/for-creators", label: "For Creators" },
      { href: `${APP_URL}/signup?as=creator`, label: "Join as a Creator", external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/refund-policy", label: "Refund Policy" },
      { href: "/disclaimer", label: "Disclaimer" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--color-border)", marginTop: 48, background: "var(--color-white)" }}>
      <div
        className="container"
        style={{ padding: "48px 24px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 28 }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: 7,
                background: "var(--gradient-brand)",
                flexShrink: 0,
              }}
            >
              <SparkIcon width={13} height={13} stroke="#fff" />
            </span>
            <span style={{ fontWeight: 750, fontSize: 15, letterSpacing: "-0.02em" }}>Vidlix</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", maxWidth: 220, margin: 0 }}>
            Creator campaigns, run end to end — matching, verification, and payouts on one platform.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{col.title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {col.links.map((l) =>
                l.external ? (
                  <a key={l.label} href={l.href} style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                    {l.label}
                  </a>
                ) : (
                  <Link key={l.href} href={l.href} style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                    {l.label}
                  </Link>
                )
              )}
            </div>
          </div>
        ))}
      </div>
      <div
        className="container"
        style={{
          padding: "20px 24px 24px",
          borderTop: "1px solid var(--color-border)",
          fontSize: 12.5,
          color: "var(--color-text-faint)",
        }}
      >
        © {new Date().getFullYear()} Vidlix. All rights reserved.
      </div>
    </footer>
  );
}
