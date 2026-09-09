import Link from "next/link";

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
          <Link href="/login" style={{ fontSize: 14, color: "var(--color-text)" }}>
            Login
          </Link>
          <Link
            href="/signup"
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
          </Link>
        </nav>
      </div>
    </header>
  );
}
