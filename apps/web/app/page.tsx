import Link from "next/link";

const campaignTypes = [
  {
    title: "Clipping",
    description: "Creators re-cut and post brand-supplied video for reach, under defined usage rights.",
  },
  {
    title: "Creator Content",
    description: "Creators produce original content to a brief, with revisions and approval built in.",
  },
  {
    title: "Product Review",
    description: "Brands ship a physical product; creators review it on receipt.",
  },
];

export default function HomePage() {
  return (
    <main>
      <header className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px" }}>
        <strong style={{ fontSize: 20 }}>Antigravity</strong>
        <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <Link href="/login">Login</Link>
          <Link
            href="/signup"
            style={{
              background: "var(--color-primary)",
              color: "var(--color-white)",
              padding: "10px 18px",
              borderRadius: "var(--radius-control)",
              fontWeight: 600,
            }}
          >
            Get Started
          </Link>
        </nav>
      </header>

      <section className="container" style={{ padding: "72px 24px", textAlign: "center" }}>
        <h1 style={{ maxWidth: 820, margin: "0 auto 20px" }}>Turn Your Campaign Into Creator-Powered Reach.</h1>
        <p style={{ maxWidth: 620, margin: "0 auto 32px", color: "var(--color-text-secondary)", fontSize: 17 }}>
          Brands launch clipping, creator content, and product review campaigns. Creators accept, deliver, and get
          paid — with verification and retention tracked end to end.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <Link
            href="/signup?as=brand"
            style={{ background: "var(--color-primary)", color: "var(--color-white)", padding: "14px 24px", borderRadius: "var(--radius-control)", fontWeight: 600 }}
          >
            Create a Campaign
          </Link>
          <Link
            href="/signup?as=creator"
            style={{ background: "var(--color-white)", border: "1px solid var(--color-border)", padding: "14px 24px", borderRadius: "var(--radius-control)", fontWeight: 600 }}
          >
            Join as a Creator
          </Link>
        </div>
      </section>

      <section className="container" style={{ padding: "48px 24px" }}>
        <h2 style={{ textAlign: "center", marginBottom: 32 }}>Campaign Types</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {campaignTypes.map((c) => (
            <div key={c.title} className="card">
              <h3>{c.title}</h3>
              <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>{c.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="container" style={{ padding: "40px 24px", color: "var(--color-text-secondary)", fontSize: 13 }}>
        © {new Date().getFullYear()} Antigravity. This is a foundation build — the full marketing site (spec §10)
        is not yet implemented.
      </footer>
    </main>
  );
}
