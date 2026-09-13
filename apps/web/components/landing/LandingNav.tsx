"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRightIcon, MenuIcon, SparkIcon, CloseIcon } from "../icons";

// Login/signup live on the app domain (see middleware.ts), so they need
// a real cross-origin <a>, not a same-origin next/link.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

const NAV = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/for-brands", label: "For Brands" },
  { href: "/for-creators", label: "For Creators" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

/** Landing-page navbar (styled by .vx-nav in landing.css). Kept separate
 * from the shared MarketingHeader so the rest of the marketing pages
 * keep their current look until they get the same treatment. */
export function LandingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="vx-nav">
      <div className="vx-container vx-nav-inner">
        <Link href="/" className="vx-nav-logo" aria-label="Vidlix home">
          <span className="vx-nav-logo-mark">
            <SparkIcon width={19} height={19} stroke="#fff" />
          </span>
          <span className="vx-nav-logo-text">Vidlix</span>
        </Link>

        <nav className="vx-nav-links" aria-label="Primary">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="vx-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="vx-nav-actions">
          <a href={`${APP_URL}/login`} className="vx-nav-login">
            Log in
          </a>
          <a href={`${APP_URL}/signup`} className="vx-btn vx-btn-primary vx-nav-cta">
            Get Started
            <span className="vx-btn-arrow" aria-hidden="true">
              <ArrowRightIcon width={13} height={13} />
            </span>
          </a>
          <button
            type="button"
            className="vx-nav-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon width={20} height={20} /> : <MenuIcon width={20} height={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="vx-nav-mobile">
          <div className="vx-container">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="vx-nav-mobile-link" onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
            <a href={`${APP_URL}/login`} className="vx-nav-mobile-link">
              Log in
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
