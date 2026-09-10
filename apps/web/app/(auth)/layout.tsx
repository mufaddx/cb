import { SparkIcon } from "@/components/icons";

// Login/signup/etc. live entirely on app.vidlix.in (see middleware.ts)
// with no marketing chrome of their own, so there was previously no
// way back to the marketing site short of the browser's own back
// button — nothing if the page was opened directly. The logo here is
// that way back, as a real cross-origin <a> (not next/link — a
// different domain, same reasoning as MarketingHeader).
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || "https://vidlix.in";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--gradient-hero-bg), var(--color-bg)",
      }}
    >
      <header style={{ padding: "22px 24px" }}>
        <a href={MARKETING_URL} style={{ display: "inline-flex", alignItems: "center", gap: 9, color: "var(--color-text)" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "var(--gradient-brand)",
              flexShrink: 0,
            }}
          >
            <SparkIcon width={16} height={16} stroke="#fff" />
          </span>
          <span style={{ fontSize: 17, fontWeight: 750, letterSpacing: "-0.02em" }}>Vidlix</span>
        </a>
      </header>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div className="card" style={{ width: "100%", maxWidth: 440, padding: "40px 36px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
