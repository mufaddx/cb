import { MarketingHeader } from "../components/MarketingHeader";
import { MarketingFooter } from "../components/MarketingFooter";
import { RevealOnScroll } from "../components/RevealOnScroll";
import { HandshakeIcon, MegaphoneIcon, PackageIcon } from "../components/icons";

// Signup lives on the app domain (see middleware.ts) — a plain <a>,
// not next/link, since this page is served from the marketing domain.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

const campaignTypes = [
  {
    icon: MegaphoneIcon,
    title: "Clipping",
    description: "Creators re-cut and post brand-supplied video for reach, under defined usage rights.",
    accent: "linear-gradient(135deg, #4f46e5, #6366f1)",
  },
  {
    icon: HandshakeIcon,
    title: "Creator Content",
    description: "Creators produce original content to a brief, with revisions and approval built in.",
    accent: "linear-gradient(135deg, #7c3aed, #a855f7)",
  },
  {
    icon: PackageIcon,
    title: "Product Review",
    description: "Brands ship a physical product; creators review it on receipt.",
    accent: "linear-gradient(135deg, #0891b2, #06b6d4)",
  },
];

const steps = [
  { title: "Create", description: "Brand defines a campaign: type, brief, targeting, budget, and usage rights." },
  { title: "Review & Pay", description: "Admin reviews the campaign; the brand pays, and funds are reserved." },
  { title: "Match", description: "Eligible creators receive offers matched to the campaign's targeting." },
  { title: "Deliver", description: "Creators accept, post or ship, and submit proof of delivery." },
  { title: "Verify & Pay Out", description: "Content and retention are verified before payout is released." },
];

const stats = [
  { value: "3", label: "campaign formats" },
  { value: "100%", label: "tracked to payout" },
  { value: "0", label: "spreadsheets required" },
];

export default function HomePage() {
  return (
    <main>
      <MarketingHeader />

      <section
        style={{
          position: "relative",
          overflow: "hidden",
          background: "var(--gradient-hero-bg), var(--color-bg)",
        }}
      >
        <div
          className="animate-float"
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-120px",
            right: "-100px",
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: "var(--gradient-brand)",
            opacity: 0.18,
            filter: "blur(50px)",
          }}
        />
        <div className="container" style={{ position: "relative", padding: "76px 24px 0", textAlign: "center" }}>
          <div className="animate-fade-up" style={{ display: "flex", justifyContent: "center" }}>
            <span className="eyebrow">Built for Indian creator campaigns</span>
          </div>
          <h1 className="animate-fade-up" style={{ maxWidth: 860, margin: "18px auto 14px", animationDelay: "0.06s" }}>
            Turn your campaign into <span style={{ backgroundImage: "var(--gradient-brand)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>creator-powered reach</span>.
          </h1>
          <p
            className="animate-fade-up"
            style={{ maxWidth: 600, margin: "0 auto 30px", color: "var(--color-text-secondary)", fontSize: 17.5, animationDelay: "0.12s" }}
          >
            Brands launch clipping, creator content, and product review campaigns. Creators accept, deliver, and get
            paid — with verification and retention tracked end to end.
          </p>
          <div className="animate-fade-up" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", animationDelay: "0.18s" }}>
            <a
              href={`${APP_URL}/signup?as=brand`}
              style={{
                background: "var(--color-text)",
                color: "var(--color-white)",
                padding: "15px 26px",
                borderRadius: "var(--radius-control)",
                fontWeight: 600,
                fontSize: 15.5,
                boxShadow: "var(--shadow-lg)",
                transition: "transform var(--duration-fast) ease",
              }}
            >
              Create a Campaign →
            </a>
            <a
              href={`${APP_URL}/signup?as=creator`}
              style={{
                background: "var(--color-white)",
                border: "1px solid var(--color-border-strong)",
                padding: "15px 26px",
                borderRadius: "var(--radius-control)",
                fontWeight: 600,
                fontSize: 15.5,
              }}
            >
              Join as a Creator
            </a>
          </div>
        </div>

        <div
          className="animate-fade-up"
          style={{ position: "relative", borderTop: "1px solid var(--color-border)", marginTop: 52, animationDelay: "0.24s" }}
        >
          <div
            className="hero-stats container"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px 56px",
              padding: "26px 24px",
            }}
          >
            {stats.map((s) => (
              <div key={s.label} className="hero-stat" style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className="hero-stat-value" style={{ fontSize: 22, fontWeight: 750, letterSpacing: "-0.02em" }}>{s.value}</span>
                <span className="hero-stat-label" style={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container" style={{ padding: "64px 24px 56px" }}>
        <RevealOnScroll>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <span className="eyebrow" style={{ marginBottom: 14 }}>How it works</span>
            <h2 style={{ marginTop: 14 }}>From brief to payout, on one rail</h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 16, maxWidth: 520, margin: "0 auto" }}>
              Every campaign moves through the same verified pipeline — no step gets skipped, and nothing gets lost in a DM thread.
            </p>
          </div>
        </RevealOnScroll>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 20 }}>
          {steps.map((s, i) => (
            <RevealOnScroll key={s.title} delayMs={i * 70}>
              <div className="card card-interactive" style={{ height: "100%" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: "var(--color-primary-soft)",
                    color: "var(--color-primary)",
                    fontWeight: 700,
                    fontSize: 13,
                    marginBottom: 14,
                  }}
                >
                  {i + 1}
                </div>
                <h3 style={{ fontSize: 16.5 }}>{s.title}</h3>
                <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: 14, lineHeight: 1.6 }}>{s.description}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <section id="campaign-types" className="container" style={{ padding: "56px 24px" }}>
        <RevealOnScroll>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <span className="eyebrow" style={{ marginBottom: 14 }}>Campaign types</span>
            <h2 style={{ marginTop: 14 }}>Three formats. One platform.</h2>
          </div>
        </RevealOnScroll>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 22 }}>
          {campaignTypes.map((c, i) => {
            const Icon = c.icon;
            return (
              <RevealOnScroll key={c.title} delayMs={i * 90}>
                <div className="card card-interactive" style={{ height: "100%", padding: 28 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: c.accent,
                      marginBottom: 18,
                    }}
                  >
                    <Icon width={22} height={22} stroke="#fff" />
                  </div>
                  <h3>{c.title}</h3>
                  <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: 14.5, lineHeight: 1.65 }}>{c.description}</p>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </section>

      <section className="container" style={{ padding: "72px 24px 96px" }}>
        <RevealOnScroll>
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 24,
              padding: "56px 40px",
              textAlign: "center",
              background: "var(--color-dark)",
              color: "#fff",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(60% 80% at 50% 0%, rgba(79,70,229,0.35) 0%, rgba(79,70,229,0) 70%)",
              }}
            />
            <div style={{ position: "relative" }}>
              <h2 style={{ color: "#fff", marginBottom: 12 }}>Ready to get started?</h2>
              <p style={{ color: "rgba(255,255,255,0.68)", marginBottom: 30, fontSize: 16 }}>
                Launch your first campaign or accept your first offer today.
              </p>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                <a
                  href={`${APP_URL}/signup?as=brand`}
                  style={{
                    background: "#fff",
                    color: "var(--color-dark)",
                    padding: "14px 24px",
                    borderRadius: "var(--radius-control)",
                    fontWeight: 600,
                    fontSize: 15,
                  }}
                >
                  Create a Campaign
                </a>
                <a
                  href={`${APP_URL}/signup?as=creator`}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "#fff",
                    padding: "14px 24px",
                    borderRadius: "var(--radius-control)",
                    fontWeight: 600,
                    fontSize: 15,
                  }}
                >
                  Join as a Creator
                </a>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      <MarketingFooter />
    </main>
  );
}
