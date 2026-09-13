import { MarketingHeader } from "../components/MarketingHeader";
import { MarketingFooter } from "../components/MarketingFooter";
import { RevealOnScroll } from "../components/RevealOnScroll";
import {
  ArrowLeftIcon,
  ChatIcon,
  CheckCircleIcon,
  GearIcon,
  HandshakeIcon,
  HomeIcon,
  InstagramIcon,
  LockIcon,
  MegaphoneIcon,
  SendIcon,
  ShieldIcon,
  TargetIcon,
  TrendingUpIcon,
  UserIcon,
  WalletIcon,
} from "../components/icons";

// Purely illustrative — the sidebar/nav shown in the hero mockup below,
// not the app's real nav config (that lives in AppShell.tsx).
const mockNav = [
  { icon: HomeIcon, label: "Dashboard", active: true },
  { icon: MegaphoneIcon, label: "Campaigns" },
  { icon: UserIcon, label: "Creators" },
  { icon: TrendingUpIcon, label: "Analytics" },
  { icon: WalletIcon, label: "Payments" },
  { icon: ChatIcon, label: "Messages" },
  { icon: GearIcon, label: "Settings" },
];

const mockCreators = [
  { name: "Ayesha K.", meta: "12 videos" },
  { name: "Rohan M.", meta: "8 videos" },
  { name: "Simran W.", meta: "6 videos" },
];

const trustSignals = [
  { icon: ShieldIcon, label: "Secure Payments" },
  { icon: UserIcon, label: "Verified Creators" },
  { icon: TrendingUpIcon, label: "Real-time Tracking" },
];

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
    description: "Creators produce original content to a brief — optionally reviewing a product you ship them — with revisions and approval built in.",
    accent: "linear-gradient(135deg, #7c3aed, #a855f7)",
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
  { value: "2", label: "campaign formats" },
  { value: "100%", label: "tracked to payout" },
  { value: "0", label: "spreadsheets required" },
];

const benefits = [
  {
    icon: LockIcon,
    title: "Escrow-style fund reservation",
    description: "A brand's payment is confirmed only by the payment provider's own signed webhook, then reserved — never spent without that confirmation.",
  },
  {
    icon: InstagramIcon,
    title: "Real Instagram data",
    description: "Follower count and average reach come from the creator's own connected Instagram account, not a number they typed in.",
  },
  {
    icon: TargetIcon,
    title: "Category-matched targeting",
    description: "Target by follower count or reach and by content category — only creators who actually fit both are ever offered the campaign.",
  },
  {
    icon: ChatIcon,
    title: "Direct messaging",
    description: "Message a creator before you commit to anything, and a running Deal Room thread once a campaign is underway.",
  },
  {
    icon: HandshakeIcon,
    title: "Retention enforced automatically",
    description: "Campaigns that require a post to stay live for a set window have that checked on a schedule — no manual follow-up needed.",
  },
  {
    icon: WalletIcon,
    title: "Transparent pricing",
    description: "Creator payout, platform fee, and tax are broken out separately before you pay — computed from the live rate card, never a guess.",
  },
];

export default function HomePage() {
  return (
    <main className="paper-page">
      <MarketingHeader />

      <section
        className="hero-wash"
        style={{
          position: "relative",
          overflow: "hidden",
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
        <div
          className="animate-float"
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: "-140px",
            left: "-120px",
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            opacity: 0.12,
            filter: "blur(60px)",
            animationDelay: "-3s",
          }}
        />
        <div className="container" style={{ position: "relative", padding: "76px 24px 0" }}>
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="hero-eyebrow-row animate-fade-up" style={{ display: "flex", justifyContent: "flex-start" }}>
                <span className="eyebrow">Built for Indian creator campaigns</span>
              </div>
              <h1 className="animate-fade-up" style={{ maxWidth: 560, margin: "18px 0 14px", animationDelay: "0.06s" }}>
                Turn your campaign into{" "}
                <span style={{ backgroundImage: "var(--gradient-brand)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                  creator-powered reach
                </span>
                .
              </h1>
              <p
                className="animate-fade-up"
                style={{ maxWidth: 520, margin: "0 0 30px", color: "var(--color-text-secondary)", fontSize: 17.5, animationDelay: "0.12s" }}
              >
                Brands launch clipping and creator content campaigns — including product reviews. Creators accept, deliver,
                and get paid — with verification and retention tracked end to end.
              </p>
              <div className="hero-cta animate-fade-up" style={{ display: "flex", gap: 14, animationDelay: "0.18s" }}>
                <a
                  href={`${APP_URL}/signup?as=brand`}
                  className="hero-cta-btn hero-cta-btn--primary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "var(--gradient-brand)",
                    color: "#fff",
                    padding: "15px 26px",
                    borderRadius: "var(--radius-control)",
                    fontWeight: 600,
                    fontSize: 15.5,
                    boxShadow: "var(--shadow-lg)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Create a Campaign
                  <ArrowLeftIcon width={15} height={15} style={{ transform: "rotate(180deg)" }} />
                </a>
                <a
                  href={`${APP_URL}/signup?as=creator`}
                  className="hero-cta-btn hero-cta-btn--secondary"
                  style={{
                    background: "var(--color-white)",
                    border: "1px solid var(--color-border-strong)",
                    padding: "15px 26px",
                    borderRadius: "var(--radius-control)",
                    fontWeight: 600,
                    fontSize: 15.5,
                    whiteSpace: "nowrap",
                  }}
                >
                  Join as a Creator
                </a>
              </div>

              <div className="hero-trust-row animate-fade-up" style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 28, animationDelay: "0.22s" }}>
                {trustSignals.map((t) => (
                  <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <t.icon width={16} height={16} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500, whiteSpace: "nowrap" }}>{t.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Purely decorative — a stylized product preview, not a real
                screenshot, so there's nothing to keep in sync as the
                actual dashboard changes. Names in "Top Creators" are
                placeholder mockup content, not real people. aria-hidden
                since a screen reader gets nothing from a fake UI. */}
            <div className="hero-visual animate-fade-up" aria-hidden="true" style={{ animationDelay: "0.24s" }}>
              <div className="hero-visual-blob" />
              <div className="hero-visual-blob-highlight" />

              <div className="hero-mock-float-card hero-mock-float-card--top">
                <span className="icon-badge icon-badge-green" style={{ width: 26, height: 26 }}>
                  <CheckCircleIcon width={13} height={13} />
                </span>
                <div>
                  <div style={{ fontWeight: 700 }}>Payout verified</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500 }}>Funds released securely</div>
                </div>
              </div>

              <div className="hero-mock-card">
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#f0645a" }} />
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#f5bd4f" }} />
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#61c554" }} />
                  <span style={{ fontSize: 11, color: "var(--color-text-faint)", marginLeft: 8 }}>app.vidlix.in</span>
                </div>

                <div style={{ display: "flex", gap: 14 }}>
                  <div className="hero-mock-sidebar">
                    <span
                      className="icon-badge icon-badge-purple"
                      style={{ width: 22, height: 22, borderRadius: 6, marginBottom: 8 }}
                    >
                      <SendIcon width={10} height={10} />
                    </span>
                    {mockNav.map((item) => (
                      <div
                        key={item.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 6px",
                          borderRadius: 6,
                          background: item.active ? "var(--color-primary-soft)" : "transparent",
                          color: item.active ? "var(--color-primary)" : "var(--color-text-faint)",
                        }}
                      >
                        <item.icon width={10} height={10} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 8.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10.5, color: "var(--color-text-secondary)", fontWeight: 500 }}>Good morning,</div>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>Your campaign is performing great! 🔥</div>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      {[
                        { v: "₹2.4L", l: "Paid out" },
                        { v: "1,240", l: "Creators" },
                        { v: "98%", l: "On time" },
                      ].map((s) => (
                        <div key={s.l} style={{ flex: 1, background: "var(--color-bg-subtle)", borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
                          <div style={{ fontWeight: 750, fontSize: 13, letterSpacing: "-0.02em" }}>{s.v}</div>
                          <div style={{ fontSize: 8.5, color: "var(--color-text-secondary)" }}>{s.l}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ background: "var(--color-bg-subtle)", borderRadius: 10, padding: "10px 10px 6px", marginBottom: 10, position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 9.5, fontWeight: 700 }}>Campaign Performance</span>
                        <span style={{ fontSize: 8, color: "var(--color-text-faint)" }}>Last 30 days</span>
                      </div>
                      <svg viewBox="0 0 200 56" preserveAspectRatio="none" style={{ width: "100%", height: 42, display: "block" }}>
                        <defs>
                          <linearGradient id="heroChartFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <polygon
                          points="0,42 25,34 50,38 75,20 100,26 125,14 150,18 175,6 200,10 200,56 0,56"
                          fill="url(#heroChartFill)"
                        />
                        <polyline
                          points="0,42 25,34 50,38 75,20 100,26 125,14 150,18 175,6 200,10"
                          fill="none"
                          stroke="var(--color-primary)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span
                        className="badge"
                        style={{ position: "absolute", top: 14, right: 8, background: "var(--color-success)", color: "#fff", fontSize: 9 }}
                      >
                        +68%
                      </span>
                    </div>

                    <div style={{ background: "var(--color-bg-subtle)", borderRadius: 10, padding: "8px 10px" }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, marginBottom: 6 }}>Top Creators</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {mockCreators.map((c) => (
                          <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                background: "var(--gradient-brand)",
                                color: "#fff",
                                fontSize: 7.5,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {c.name.charAt(0)}
                            </span>
                            <span style={{ fontSize: 9, fontWeight: 600, flex: 1 }}>{c.name}</span>
                            <span style={{ fontSize: 8, color: "var(--color-text-faint)" }}>{c.meta}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hero-mock-float-card hero-mock-float-card--middle">
                <span className="icon-badge icon-badge-pink" style={{ width: 26, height: 26 }}>
                  <ChatIcon width={13} height={13} />
                </span>
                <div>
                  <div style={{ fontWeight: 700 }}>Creator accepted offer</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500 }}>2 minutes ago</div>
                </div>
              </div>

              <div className="hero-mock-float-card hero-mock-float-card--bottom">
                <span className="icon-badge icon-badge-blue" style={{ width: 26, height: 26 }}>
                  <SendIcon width={13} height={13} />
                </span>
                <div>
                  <div style={{ fontWeight: 700 }}>Content delivered</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500 }}>Ready for review</div>
                </div>
              </div>
            </div>
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
            <h2 style={{ marginTop: 14 }}>Two formats. One platform.</h2>
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

      <section className="container" style={{ padding: "56px 24px" }}>
        <RevealOnScroll>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <span className="eyebrow" style={{ marginBottom: 14 }}>Why Vidlix</span>
            <h2 style={{ marginTop: 14 }}>Built so nothing depends on trust alone</h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 16, maxWidth: 560, margin: "0 auto" }}>
              Every claim below is something the platform actually enforces, not a promise in the fine print.
            </p>
          </div>
        </RevealOnScroll>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <RevealOnScroll key={b.title} delayMs={i * 60}>
                <div className="card" style={{ height: "100%" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "var(--color-primary-soft)",
                      color: "var(--color-primary)",
                      marginBottom: 14,
                    }}
                  >
                    <Icon width={18} height={18} />
                  </div>
                  <h3 style={{ fontSize: 16 }}>{b.title}</h3>
                  <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: 14, lineHeight: 1.6 }}>{b.description}</p>
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
                  className="cta-btn cta-btn--light"
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
                  className="cta-btn cta-btn--dark"
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
