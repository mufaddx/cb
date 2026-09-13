import type { SVGProps } from "react";
import { LandingFooter } from "../components/landing/LandingFooter";
import { LandingNav } from "../components/landing/LandingNav";
import { RevealOnScroll } from "../components/RevealOnScroll";
import {
  ArrowRightIcon,
  BarChartIcon,
  CalendarIcon,
  ChatIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  FileTextIcon,
  GearIcon,
  HeartIcon,
  HomeIcon,
  InstagramIcon,
  LockIcon,
  MegaphoneIcon,
  PackageIcon,
  PencilIcon,
  PlayIcon,
  ScissorsIcon,
  SearchIcon,
  SendIcon,
  ShieldIcon,
  SparkIcon,
  TargetIcon,
  TrendingUpIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from "../components/icons";

// Signup lives on the app domain (see middleware.ts) — plain <a>, not
// next/link, since this page is served from the marketing domain.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

type Icon = (props: SVGProps<SVGSVGElement>) => JSX.Element;
type Tint = "purple" | "blue" | "green" | "amber" | "pink";

const TINT: Record<Tint, { bg: string; fg: string }> = {
  purple: { bg: "var(--vx-t-purple)", fg: "var(--vx-t-purple-fg)" },
  blue: { bg: "var(--vx-t-blue)", fg: "var(--vx-t-blue-fg)" },
  green: { bg: "var(--vx-t-green)", fg: "var(--vx-t-green-fg)" },
  amber: { bg: "var(--vx-t-amber)", fg: "var(--vx-t-amber-fg)" },
  pink: { bg: "var(--vx-t-pink)", fg: "var(--vx-t-pink-fg)" },
};

/* ---------------- content ----------------
   Each message appears once on the page: the stats live only in the
   band under the hero, the trust signals only under the hero CTAs. */

const heroTrust: Array<{ icon: Icon; label: string }> = [
  { icon: ShieldIcon, label: "Secure Payments" },
  { icon: UsersIcon, label: "Verified Creators" },
  { icon: BarChartIcon, label: "Real-time Tracking" },
];

const stats = [
  { value: "2+", label: "Campaign formats" },
  { value: "100%", label: "Tracked to payout" },
  { value: "0", label: "Spreadsheets required" },
  { value: "10x", label: "Faster campaign launch" },
];

const steps: Array<{ title: string; description: string; icon: Icon; tint: Tint; link: string; href: string }> = [
  {
    title: "Create",
    description: "Brand defines a campaign: type, brief, targeting, budget, and usage rights.",
    icon: FileTextIcon,
    tint: "purple",
    link: "Set your goals",
    href: `${APP_URL}/signup?as=brand`,
  },
  {
    title: "Review & Pay",
    description: "Admin reviews the campaign; the brand pays, and funds are reserved.",
    icon: SearchIcon,
    tint: "blue",
    link: "See pricing",
    href: "/pricing",
  },
  {
    title: "Match",
    description: "Eligible creators receive offers matched to the campaign's targeting.",
    icon: UsersIcon,
    tint: "green",
    link: "Find the right creators",
    href: "/for-brands",
  },
  {
    title: "Deliver",
    description: "Creators accept, post or ship, and submit proof of delivery.",
    icon: PackageIcon,
    tint: "amber",
    link: "See the full flow",
    href: "/how-it-works",
  },
  {
    title: "Verify & Pay Out",
    description: "Content and retention are verified before payout is released.",
    icon: WalletIcon,
    tint: "pink",
    link: "Join as a creator",
    href: "/for-creators",
  },
];

const benefits: Array<{ icon: Icon; tint: Tint; bg: string; title: string; description: string; link: string; href: string }> = [
  {
    icon: LockIcon,
    tint: "purple",
    bg: "linear-gradient(160deg, rgba(255,255,255,.86), rgba(243,239,255,.9))",
    title: "Escrow-style fund reservation",
    description:
      "A brand's payment is confirmed only by the payment provider's own signed webhook, then reserved — never spent without that confirmation.",
    link: "Learn more",
    href: "/how-it-works",
  },
  {
    icon: InstagramIcon,
    tint: "blue",
    bg: "linear-gradient(160deg, rgba(255,255,255,.86), rgba(234,242,255,.9))",
    title: "Real Instagram data",
    description:
      "Follower count and average reach come from the creator's own connected Instagram account, not a number they typed in.",
    link: "For creators",
    href: "/for-creators",
  },
  {
    icon: TargetIcon,
    tint: "green",
    bg: "linear-gradient(160deg, rgba(255,255,255,.86), rgba(232,249,241,.9))",
    title: "Category-matched targeting",
    description:
      "Target by follower count or reach and by content category — only creators who actually fit both are ever offered the campaign.",
    link: "For brands",
    href: "/for-brands",
  },
  {
    icon: ChatIcon,
    tint: "amber",
    bg: "linear-gradient(160deg, rgba(255,255,255,.86), rgba(255,245,230,.92))",
    title: "Direct messaging",
    description:
      "Message a creator before you commit to anything, and a running Deal Room thread once a campaign is underway.",
    link: "Open Deal Room",
    href: `${APP_URL}/login`,
  },
  {
    icon: HeartIcon,
    tint: "pink",
    bg: "linear-gradient(160deg, rgba(255,255,255,.86), rgba(255,238,245,.92))",
    title: "Retention enforced automatically",
    description:
      "Campaigns that require a post to stay live for a set window have that checked on a schedule — no manual follow-up needed.",
    link: "Read the FAQ",
    href: "/faq",
  },
  {
    icon: WalletIcon,
    tint: "blue",
    bg: "linear-gradient(160deg, rgba(255,255,255,.86), rgba(234,242,255,.9))",
    title: "Transparent pricing",
    description:
      "Creator payout, platform fee, and tax are broken out separately before you pay — computed from the live rate card, never a guess.",
    link: "View pricing details",
    href: "/pricing",
  },
];

// Illustrative only — the sidebar in the hero's dashboard mockup, not
// the app's real nav (that lives in AppShell.tsx).
const mockNav: Array<{ icon: Icon; label: string; active?: boolean }> = [
  { icon: HomeIcon, label: "Dashboard", active: true },
  { icon: MegaphoneIcon, label: "Campaigns" },
  { icon: UserIcon, label: "Creators" },
  { icon: BarChartIcon, label: "Analytics" },
  { icon: WalletIcon, label: "Payments" },
  { icon: ChatIcon, label: "Messages" },
  { icon: GearIcon, label: "Settings" },
];

// Placeholder mockup names, rendered as initials — not real people.
const mockCreators = [
  { name: "Ayesha Khan", meta: "12 videos", bg: "linear-gradient(135deg,#f472b6,#a855f7)" },
  { name: "Rohan Mehta", meta: "8 videos", bg: "linear-gradient(135deg,#60a5fa,#6366f1)" },
  { name: "Simran Works", meta: "6 videos", bg: "linear-gradient(135deg,#34d399,#0ea5e9)" },
];

/* ---------------- small building blocks ---------------- */

function CurvedArrow({ flip = false, width = 46 }: { flip?: boolean; width?: number }) {
  return (
    <svg width={width} height={width * 0.62} viewBox="0 0 46 28" fill="none" style={{ transform: flip ? "scaleX(-1)" : undefined }}>
      <path d="M3 4c8 17 22 20 36 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m33 12 7 5-8 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DashboardMockup() {
  return (
    <div className="vx-dash">
      <div className="vx-dash-chrome">
        <span className="vx-dot" style={{ background: "#ff5f57" }} />
        <span className="vx-dot" style={{ background: "#febc2e" }} />
        <span className="vx-dot" style={{ background: "#28c840" }} />
      </div>
      <div className="vx-dash-body">
        <div className="vx-dash-side">
          <div className="vx-dash-brand">
            <span>
              <SparkIcon width={12} height={12} stroke="#fff" />
            </span>
            Vidlix
          </div>
          <div className="vx-dash-nav">
            {mockNav.map((item) => (
              <div key={item.label} className={`vx-dash-nav-item${item.active ? " is-active" : ""}`}>
                <item.icon width={13} height={13} style={{ flexShrink: 0 }} />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="vx-dash-main">
          <div className="vx-dash-greet-row">
            <div style={{ minWidth: 0 }}>
              <div className="vx-dash-greet-sm">Welcome back,</div>
              <div className="vx-dash-greet-lg">Your campaign is performing great! 🔥</div>
            </div>
            <span className="vx-dash-pill">
              <CalendarIcon width={11} height={11} />
              Last 45 days
              <ChevronDownIcon width={10} height={10} />
            </span>
          </div>

          <div className="vx-dash-stats">
            {[
              { v: "₹2.4L", l: "Paid out", icon: WalletIcon, tint: "blue" as Tint },
              { v: "1,240", l: "Creators", icon: UsersIcon, tint: "green" as Tint },
              { v: "98%", l: "On time", icon: CheckCircleIcon, tint: "amber" as Tint },
            ].map((s) => (
              <div key={s.l} className="vx-dash-stat">
                <span className="vx-dash-stat-ico" style={{ background: TINT[s.tint].bg, color: TINT[s.tint].fg }}>
                  <s.icon width={15} height={15} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="vx-dash-stat-v">{s.v}</div>
                  <div className="vx-dash-stat-l">{s.l}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="vx-dash-row">
            <div className="vx-dash-panel">
              <div className="vx-dash-panel-head">
                <span className="vx-dash-panel-title">Campaign Performance</span>
                <span className="vx-dash-pill" style={{ padding: "4px 8px", fontSize: 9 }}>
                  Last 30 days <ChevronDownIcon width={9} height={9} />
                </span>
              </div>
              <div className="vx-dash-chart">
                <svg viewBox="0 0 240 92" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="vxChartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6d43f0" stopOpacity="0.26" />
                      <stop offset="100%" stopColor="#6d43f0" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[22, 46, 70].map((y) => (
                    <line key={y} x1="0" x2="240" y1={y} y2={y} stroke="#eef0f6" strokeWidth="1" />
                  ))}
                  <path
                    d="M0 74 C14 60 22 58 32 66 S52 80 64 66 84 48 98 56 116 70 128 52 146 30 160 38 178 50 192 36 214 30 240 20 V92 H0 Z"
                    fill="url(#vxChartFill)"
                  />
                  <path
                    d="M0 74 C14 60 22 58 32 66 S52 80 64 66 84 48 98 56 116 70 128 52 146 30 160 38 178 50 192 36 214 30 240 20"
                    fill="none"
                    stroke="#6d43f0"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  <circle cx="160" cy="38" r="4" fill="#fff" stroke="#6d43f0" strokeWidth="2.2" />
                </svg>
                <span className="vx-dash-tip">+68%</span>
              </div>
            </div>

            <div className="vx-dash-panel">
              <div className="vx-dash-panel-head">
                <span className="vx-dash-panel-title">Top Creators</span>
              </div>
              {mockCreators.map((c) => (
                <div key={c.name} className="vx-dash-creator">
                  <span className="vx-dash-avatar" style={{ background: c.bg }}>
                    {c.name.charAt(0)}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="vx-dash-creator-n">{c.name}</div>
                    <div className="vx-dash-creator-m">{c.meta}</div>
                  </div>
                  <TrendingUpIcon width={12} height={12} style={{ color: "#10b981", flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */

export default function HomePage() {
  return (
    <main className="vx-landing">
      <LandingNav />

      {/* ===================== HERO ===================== */}
      <section className="vx-hero">
        <div className="vx-container vx-hero-grid">
          <div className="vx-hero-copy">
            <span className="vx-badge animate-fade-up">
              <span aria-hidden="true">🚀</span> Built for Indian creator campaigns
            </span>
            <h1 className="vx-h1 animate-fade-up" style={{ animationDelay: "0.06s" }}>
              Turn your <br className="vx-br-lg" />
              campaign into <br className="vx-br-lg" />
              <span className="vx-grad">
                creator-powered <br className="vx-br-lg" />
                reach
              </span>
              .
            </h1>
            <p className="vx-lead animate-fade-up" style={{ animationDelay: "0.12s" }}>
              Brands launch clipping and creator content campaigns — including product reviews. Creators accept, deliver,
              and get paid — with verification and retention tracked end to end.
            </p>
            <div className="vx-hero-cta animate-fade-up" style={{ animationDelay: "0.18s" }}>
              <a href={`${APP_URL}/signup?as=brand`} className="vx-btn vx-btn-primary">
                Create a Campaign
                <span className="vx-btn-arrow" aria-hidden="true">
                  <ArrowRightIcon width={13} height={13} />
                </span>
              </a>
              <a href={`${APP_URL}/signup?as=creator`} className="vx-btn vx-btn-secondary" style={{ color: "var(--color-primary)" }}>
                Join as a Creator
              </a>
            </div>
            <div className="vx-hero-trust animate-fade-up" style={{ animationDelay: "0.24s" }}>
              {heroTrust.map((t) => (
                <div key={t.label} className="vx-hero-trust-item">
                  <t.icon width={18} height={18} />
                  {t.label}
                </div>
              ))}
            </div>
          </div>

          {/* Decorative product preview — not a real screenshot. */}
          <div className="vx-hero-visual animate-fade-up" aria-hidden="true" style={{ animationDelay: "0.2s" }}>
            <div className="vx-ring" />

            <div className="vx-script" style={{ left: "-4%", top: "-2%", transform: "rotate(-10deg)" }}>
              {"More Creators\nBigger Stories"}
              <span style={{ display: "block", marginLeft: 60, marginTop: 2 }}>
                <CurvedArrow />
              </span>
            </div>
            <div className="vx-script vx-script-edge" style={{ right: "-10%", top: "30%", transform: "rotate(-12deg)" }}>
              {"Ideas\nCreators\nGrowth"}
            </div>

            <DashboardMockup />

            <div className="vx-float vx-float-a">
              <span className="vx-float-ico" style={{ background: "linear-gradient(150deg,#6ee7b7,#10b981)", color: "#fff" }}>
                <CheckIcon width={17} height={17} strokeWidth={2.6} />
              </span>
              <div>
                <div className="vx-float-t">Payout verified</div>
                <div className="vx-float-s">Funds released securely</div>
              </div>
            </div>
            <div className="vx-float vx-float-b">
              <span className="vx-float-ico" style={{ background: "linear-gradient(150deg,#a78bfa,#6d28d9)", color: "#fff" }}>
                <PlayIcon width={15} height={15} />
              </span>
              <div>
                <div className="vx-float-t">Creator accepted offer</div>
                <div className="vx-float-s">2 minutes ago</div>
              </div>
            </div>
            <div className="vx-float vx-float-c">
              <span className="vx-float-ico" style={{ background: "var(--vx-t-blue)", color: "#3b5bf5" }}>
                <SendIcon width={16} height={16} />
              </span>
              <div>
                <div className="vx-float-t">Content delivered</div>
                <div className="vx-float-s">Ready for review</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== STATS BAND ===================== */}
      <div className="vx-statsband">
        <div className="vx-container vx-statsband-inner">
          {stats.map((s) => (
            <div key={s.label} className="vx-statsband-item">
              <div className="vx-statsband-v">{s.value}</div>
              <div className="vx-statsband-l">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===================== HOW IT WORKS ===================== */}
      <section className="vx-section">
        <div className="vx-container-wide" style={{ position: "relative" }}>
          <div className="vx-script" aria-hidden="true" style={{ left: "6%", top: 0, transform: "rotate(-12deg)" }}>
            {"Ideas\ninto income"}
            <span style={{ display: "block", marginLeft: 50 }}>
              <CurvedArrow width={38} />
            </span>
          </div>

          <RevealOnScroll>
            <div className="vx-section-head">
              <span className="vx-badge">
                <GearIcon width={15} height={15} /> How it works
              </span>
              <h2 className="vx-h2">
                From brief to payout, <span className="vx-grad">on one rail</span>
              </h2>
              <p>Every campaign moves through the same verified pipeline — no step gets skipped, and nothing gets lost in a DM thread.</p>
            </div>
          </RevealOnScroll>

          <div className="vx-steps">
            {steps.map((s, i) => (
              <RevealOnScroll key={s.title} delayMs={i * 70} className="vx-step-cell">
                <div className="vx-step" style={{ height: "100%" }}>
                  <div className="vx-step-top">
                    <span className="vx-step-num" style={{ background: TINT[s.tint].bg, color: TINT[s.tint].fg }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={`vx-tile vx-tile-${s.tint}`}>
                      <s.icon width={30} height={30} strokeWidth={2} />
                    </span>
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.description}</p>
                  <a href={s.href} className="vx-step-link" style={{ background: TINT[s.tint].bg, color: TINT[s.tint].fg }}>
                    {s.link}
                    <ArrowRightIcon width={14} height={14} />
                  </a>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CAMPAIGN TYPES ===================== */}
      <section id="campaign-types" className="vx-section" style={{ paddingTop: 20 }}>
        <div className="vx-container" style={{ position: "relative" }}>
          <div className="vx-script" aria-hidden="true" style={{ right: "4%", top: 20, transform: "rotate(-10deg)" }}>
            {"More\nCreator Possibilities"}
            <span style={{ display: "block", marginTop: 2 }}>
              <CurvedArrow flip width={40} />
            </span>
          </div>

          <RevealOnScroll>
            <div className="vx-section-head">
              <span className="vx-badge">Campaign types</span>
              <h2 className="vx-h2">
                Two formats. <span className="vx-grad">One platform.</span>
              </h2>
              <p>Different ways to create. Same verified payouts, tracking, and support. Choose the format that fits your campaign.</p>
            </div>
          </RevealOnScroll>

          <div className="vx-formats">
            <RevealOnScroll>
              <div className="vx-format" style={{ height: "100%", background: "linear-gradient(135deg, rgba(255,255,255,.82), rgba(243,236,255,.78))" }}>
                <div className="vx-format-body">
                  <span className="vx-tile vx-tile-purple vx-tile-sm" style={{ width: 62, height: 62, transform: "none" }}>
                    <ScissorsIcon width={28} height={28} strokeWidth={2} />
                  </span>
                  <h3>Clipping</h3>
                  <p>Creators re-cut and post brand-supplied video for reach, under defined usage rights.</p>
                  <div className="vx-checks">
                    {["Brand footage", "Clear guidelines", "Performance tracking"].map((c) => (
                      <span key={c} className="vx-check">
                        <span style={{ background: "#7c3aed" }}>
                          <CheckIcon width={10} height={10} strokeWidth={3} />
                        </span>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <a href={`${APP_URL}/signup?as=brand`} className="vx-btn vx-btn-dark vx-format-cta" style={{ position: "relative", zIndex: 2 }}>
                  Start a Clipping Campaign
                  <ArrowRightIcon width={16} height={16} />
                </a>
                <div className="vx-illus vx-illus-stack" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <span className="vx-illus-play">
                    <PlayIcon width={28} height={28} />
                  </span>
                  <span className="vx-illus-badge">
                    <ScissorsIcon width={24} height={24} strokeWidth={2.2} />
                  </span>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delayMs={90}>
              <div className="vx-format" style={{ height: "100%", background: "linear-gradient(135deg, rgba(255,255,255,.82), rgba(230,242,255,.8))" }}>
                <div className="vx-format-body">
                  <span className="vx-tile vx-tile-blue vx-tile-sm" style={{ width: 62, height: 62, transform: "none" }}>
                    <PencilIcon width={27} height={27} strokeWidth={2} />
                  </span>
                  <h3>Creator Content</h3>
                  <p>
                    Creators produce original content to a brief — optionally reviewing a product you ship them — with revisions and
                    approval built in.
                  </p>
                  <div className="vx-checks">
                    {["Original content", "Revisions & approval", "Product reviews"].map((c) => (
                      <span key={c} className="vx-check">
                        <span style={{ background: "#3b82f6" }}>
                          <CheckIcon width={10} height={10} strokeWidth={3} />
                        </span>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <a href={`${APP_URL}/signup?as=brand`} className="vx-btn vx-btn-dark vx-format-cta" style={{ position: "relative", zIndex: 2 }}>
                  Launch a Creator Campaign
                  <ArrowRightIcon width={16} height={16} />
                </a>
                <div className="vx-illus" aria-hidden="true">
                  <div className="vx-illus-phone">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="vx-illus-chips">
                    {[
                      { l: "Idea", c: "#f59e0b" },
                      { l: "Create", c: "#6366f1" },
                      { l: "Review", c: "#0ea5e9" },
                      { l: "Publish", c: "#10b981" },
                    ].map((x) => (
                      <span key={x.l} className="vx-illus-chip">
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: x.c }} />
                        {x.l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ===================== WHY VIDLIX ===================== */}
      <section className="vx-section" style={{ paddingTop: 20 }}>
        <div className="vx-container" style={{ position: "relative" }}>
          <div className="vx-script" aria-hidden="true" style={{ left: "1%", top: 14, transform: "rotate(-10deg)" }}>
            {"Safer\nCreator Economy"}
            <span style={{ display: "block", marginLeft: 70 }}>
              <CurvedArrow width={36} />
            </span>
          </div>
          <div className="vx-script" aria-hidden="true" style={{ right: "1%", top: 14, transform: "rotate(-10deg)" }}>
            {"Real Data\nReal Opportunities"}
          </div>

          <RevealOnScroll>
            <div className="vx-section-head">
              <span className="vx-badge">Why Vidlix</span>
              <h2 className="vx-h2">
                Built so nothing depends on <span className="vx-grad">trust alone</span>
              </h2>
              <p>Every claim below is something the platform actually enforces, not a promise in the fine print.</p>
            </div>
          </RevealOnScroll>

          <div className="vx-why">
            {benefits.map((b, i) => (
              <RevealOnScroll key={b.title} delayMs={i * 60}>
                <a href={b.href} className="vx-why-card" style={{ height: "100%", ["--vx-card-bg" as string]: b.bg, color: "inherit" }}>
                  <span className={`vx-tile vx-tile-${b.tint}`} style={{ width: 64, height: 64, borderRadius: 20 }}>
                    <b.icon width={28} height={28} strokeWidth={2} />
                  </span>
                  <h3>{b.title}</h3>
                  <p>{b.description}</p>
                  <div className="vx-why-foot" style={{ color: TINT[b.tint].fg }}>
                    {b.link}
                    <span className="vx-why-arrow">
                      <ArrowRightIcon width={14} height={14} />
                    </span>
                  </div>
                </a>
              </RevealOnScroll>
            ))}

            <RevealOnScroll delayMs={360} className="vx-why-aside-cell">
              <div className="vx-why-aside" aria-hidden="true" style={{ height: "100%" }}>
                <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: 180 }}>
                  <span className="vx-shield-ring" />
                  <span className="vx-shield">
                    <CheckIcon width={54} height={54} strokeWidth={3} />
                  </span>
                </div>
                <div className="vx-why-caption">
                  <SparkIcon width={18} height={18} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                  A safer, fairer, and more transparent creator economy.
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section className="vx-cta-wrap">
        <div className="vx-container-wide">
          <RevealOnScroll>
            <div className="vx-cta">
              <div className="vx-script" aria-hidden="true" style={{ left: "5%", top: "12%", transform: "rotate(-10deg)" }}>
                {"Ideas\ninto impact"}
                <span style={{ display: "block", marginLeft: 56 }}>
                  <CurvedArrow width={36} />
                </span>
              </div>
              <div className="vx-script" aria-hidden="true" style={{ right: "6%", top: "12%", transform: "rotate(-12deg)" }}>
                {"A fairer\ncreator economy"}
              </div>

              <div className="vx-cta-deco vx-cube vx-cta-cube-a" aria-hidden="true">
                <PlayIcon width={40} height={40} />
              </div>
              <div className="vx-cta-deco vx-cube vx-cta-cube-b" aria-hidden="true">
                <UserIcon width={26} height={26} />
              </div>
              <div className="vx-cta-deco vx-cta-chart" aria-hidden="true">
                <div className="vx-cta-chart-lbl">
                  <TrendingUpIcon width={14} height={14} style={{ color: "#34d399" }} />
                  More Opportunities
                </div>
                <svg viewBox="0 0 160 62" preserveAspectRatio="none">
                  {[
                    { x: 10, h: 18 },
                    { x: 42, h: 26 },
                    { x: 74, h: 22 },
                    { x: 106, h: 36 },
                    { x: 138, h: 50 },
                  ].map((b) => (
                    <rect key={b.x} x={b.x} y={62 - b.h} width="14" height={b.h} rx="3" fill="rgba(129,140,248,.55)" />
                  ))}
                  <path d="M6 50 C30 40 44 46 62 36 S100 30 118 20 150 6 156 4" fill="none" stroke="#a78bfa" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </div>

              <div className="vx-cta-inner">
                <span className="vx-badge">
                  <span aria-hidden="true">🚀</span> Launch your first campaign
                </span>
                <h2>
                  Ready to get <span className="vx-cta-grad">started?</span>
                </h2>
                <p>Launch your first campaign or accept your first offer today.</p>
                <div className="vx-cta-buttons">
                  <a href={`${APP_URL}/signup?as=brand`} className="vx-btn vx-btn-primary">
                    Create a Campaign
                    <span className="vx-btn-arrow" aria-hidden="true">
                      <ArrowRightIcon width={13} height={13} />
                    </span>
                  </a>
                  <a href={`${APP_URL}/signup?as=creator`} className="vx-btn vx-btn-ghost-dark">
                    Join as a Creator
                    <span className="vx-btn-arrow" aria-hidden="true">
                      <ArrowRightIcon width={13} height={13} />
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
