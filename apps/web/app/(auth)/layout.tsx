import { ArrowLeftIcon } from "@/components/icons";

// Login/signup/etc. live entirely on app.vidlix.in (see middleware.ts)
// with no marketing chrome of their own, so there was previously no
// way back to the marketing site short of the browser's own back
// button — nothing if the page was opened directly. This icon is
// that way back, as a real cross-origin <a> (not next/link — a
// different domain, same reasoning as MarketingHeader). Just the
// icon, not a full logo header bar — the card is the page here.
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || "https://vidlix.in";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="auth-shell"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div className="card auth-card" style={{ position: "relative", width: "100%", maxWidth: 440, padding: "40px 36px" }}>
        <a
          href={MARKETING_URL}
          aria-label="Back to vidlix.in"
          title="Back to vidlix.in"
          style={{
            position: "absolute",
            top: 18,
            left: 18,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            color: "var(--color-text-secondary)",
            background: "var(--color-bg-subtle)",
          }}
        >
          <ArrowLeftIcon width={17} height={17} />
        </a>
        <div style={{ paddingTop: 30 }}>{children}</div>
      </div>
    </div>
  );
}
