import Link from "next/link";
import { SparkIcon } from "./icons";

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
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(244, 240, 230, 0.82)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--color-text)" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "var(--gradient-brand)",
              boxShadow: "var(--shadow-glow)",
              flexShrink: 0,
            }}
          >
            <SparkIcon width={17} height={17} stroke="#fff" />
          </span>
          <span style={{ fontSize: 19, fontWeight: 750, letterSpacing: "-0.02em" }}>Vidlix</span>
        </Link>
        <nav className="desktop-only" style={{ display: "flex", gap: 26, alignItems: "center" }}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)" }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <a href={`${APP_URL}/login`} className="desktop-only" style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text)" }}>
            Log in
          </a>
          <a
            href={`${APP_URL}/signup`}
            style={{
              background: "var(--color-text)",
              color: "var(--color-white)",
              padding: "9px 18px",
              borderRadius: "var(--radius-control)",
              fontWeight: 600,
              fontSize: 14,
              transition: "background-color var(--duration-fast) ease",
            }}
          >
            Get Started
          </a>
        </div>
      </div>
    </header>
  );
}
