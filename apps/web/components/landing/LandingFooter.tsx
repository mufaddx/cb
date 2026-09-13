import Link from "next/link";
import { FacebookIcon, InstagramIcon, SparkIcon, XIcon } from "../icons";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// Only the accounts confirmed to exist (no live Vidlix LinkedIn/YouTube
// page, so those are left out rather than shipped as dead links).
const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://instagram.com/vidlix.in", Icon: InstagramIcon },
  { label: "Facebook", href: "https://facebook.com/vidlix.in", Icon: FacebookIcon },
  { label: "X (Twitter)", href: "https://x.com/vidlix", Icon: XIcon },
];

const COLUMNS: Array<{ title: string; links: Array<{ href: string; label: string; external?: boolean }> }> = [
  {
    title: "Platform",
    links: [
      { href: "/how-it-works", label: "How It Works" },
      { href: "/#campaign-types", label: "Campaign Types" },
      { href: "/pricing", label: "Pricing" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    title: "Get Started",
    links: [
      { href: "/for-brands", label: "For Brands" },
      { href: `${APP_URL}/signup?as=brand`, label: "Create a Campaign", external: true },
      { href: "/for-creators", label: "For Creators" },
      { href: `${APP_URL}/signup?as=creator`, label: "Join as a Creator", external: true },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
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
];

export function LandingFooter() {
  return (
    <footer className="vx-footer">
      <div className="vx-container">
        <div className="vx-footer-grid">
          <div className="vx-footer-brand">
            <div className="vx-footer-brand-name">
              <span className="vx-nav-logo-mark">
                <SparkIcon width={19} height={19} stroke="#fff" />
              </span>
              <span className="vx-nav-logo-text">Vidlix</span>
            </div>
            <p className="vx-footer-tag">Creator campaigns, run end to end.</p>
            <div className="vx-footer-socials">
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="vx-footer-social">
                  <Icon width={17} height={17} />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="vx-footer-coltitle">{col.title}</div>
              <div className="vx-footer-links">
                {col.links.map((l) =>
                  l.external ? (
                    <a key={l.label} href={l.href}>
                      {l.label}
                    </a>
                  ) : (
                    <Link key={l.label} href={l.href}>
                      {l.label}
                    </Link>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="vx-footer-bottom">
          <span>© {new Date().getFullYear()} Vidlix. All rights reserved.</span>
          <span>
            Made with <span aria-label="love">❤️</span> in India <span aria-label="India">🇮🇳</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
