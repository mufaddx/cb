import Link from "next/link";
import { FacebookIcon, InstagramIcon, SparkIcon, XIcon, YoutubeIcon } from "./icons";

// Same reasoning as MarketingHeader: /login and /signup live on the
// app domain, so they need a real cross-origin <a>, not a same-origin
// <Link>.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// Real accounts under the "vidlix.in" handle, confirmed live by
// fetching each one before shipping the link. Facebook and X block
// automated fetches, so those couldn't be confirmed the same way —
// double check those two are real before assuming this is complete.
// youtube.com/@vidlix.in returned a genuine 404, so it's left out
// rather than shipped as a dead link.
const SOCIAL_LINKS: Array<{ label: string; href: string; Icon: typeof InstagramIcon }> = [
  { label: "Instagram", href: "https://instagram.com/vidlix.in", Icon: InstagramIcon },
  { label: "Facebook", href: "https://facebook.com/vidlix.in", Icon: FacebookIcon },
  { label: "X (Twitter)", href: "https://x.com/vidlix", Icon: XIcon },
];

const COLUMNS: Array<{ title: string; links: Array<{ href: string; label: string; external?: boolean }> }> = [
  {
    title: "Platform",
    links: [
      { href: "/how-it-works", label: "How It Works" },
      { href: "/#campaign-types", label: "Campaign Types" },
      { href: "/pricing", label: "Pricing" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    title: "Get Started",
    links: [
      { href: "/for-brands", label: "For Brands" },
      { href: `${APP_URL}/signup?as=brand`, label: "Create a Campaign", external: true },
      { href: "/for-creators", label: "For Creators" },
      { href: `${APP_URL}/signup?as=creator`, label: "Join as a Creator", external: true },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
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
];

export function MarketingFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--color-border)", marginTop: 48, background: "var(--color-white)" }}>
      <div className="container" style={{ padding: "48px 24px 32px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "32px 64px", marginBottom: 36 }}>
          <div style={{ flex: "1 1 240px" }}>
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
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", maxWidth: 260, margin: "0 0 16px" }}>
              Creator campaigns, run end to end — matching, verification, and payouts on one platform.
            </p>
          </div>
          {SOCIAL_LINKS.length > 0 && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: "var(--color-bg-subtle)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <Icon width={17} height={17} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "28px 40px" }}>
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
