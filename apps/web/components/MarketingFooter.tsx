import Link from "next/link";

const COLUMNS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
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
      { href: "/signup?as=brand", label: "Create a Campaign" },
    ],
  },
  {
    title: "For Creators",
    links: [
      { href: "/for-creators", label: "For Creators" },
      { href: "/signup?as=creator", label: "Join as a Creator" },
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
    <footer style={{ borderTop: "1px solid var(--color-border)", marginTop: 48 }}>
      <div
        className="container"
        style={{ padding: "40px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 24 }}
      >
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{col.title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {col.links.map((l) => (
                <Link key={l.href} href={l.href} style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="container" style={{ padding: "0 24px 24px", fontSize: 12, color: "var(--color-text-secondary)" }}>
        © {new Date().getFullYear()} Antigravity.
      </div>
    </footer>
  );
}
