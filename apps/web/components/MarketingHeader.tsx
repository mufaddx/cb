import Link from "next/link";

// Login/signup live on the app domain (see middleware.ts), so from
// the marketing site they must be a real cross-origin link, not a
// Next <Link> (which would try a same-origin client-side transition
// first). Empty in dev so localhost:3000 keeps working with one host.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

const NAV = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/for-brands", label: "For Brands" },
  { href: "/for-creators", label: "For Creators" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

export function MarketingHeader() {
  return (
    <header style={{ borderBottom: "1px solid var(--color-border)" }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px" }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>
          Antigravity
        </Link>
        <nav style={{ display: "flex", gap: 22, alignItems: "center" }}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} style={{ fontSize: 14, color: "var(--color-text)" }}>
              {item.label}
            </Link>
          ))}
          <a href={`${APP_URL}/login`} style={{ fontSize: 14, color: "var(--color-text)" }}>
            Login
          </a>
          <a
            href={`${APP_URL}/signup`}
            style={{
              background: "var(--color-primary)",
              color: "var(--color-white)",
              padding: "10px 18px",
              borderRadius: "var(--radius-control)",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Get Started
          </a>
        </nav>
      </div>
    </header>
  );
}
