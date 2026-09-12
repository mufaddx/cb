"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AuthNavLink } from "@/components/AuthNavLink";
import { ArrowLeftIcon, SparkIcon } from "@/components/icons";
import { authSideFor } from "@/lib/authSide";

// Login/signup/etc. live entirely on app.vidlix.in (see middleware.ts)
// with no marketing chrome of their own, so there was previously no
// way back to the marketing site short of the browser's own back
// button — nothing if the page was opened directly.
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || "https://vidlix.in";

const COPY = {
  login: {
    heading: "Turn your campaigns into creator‑powered reach.",
    body: "Brands launch clipping and creator content campaigns. Creators accept, deliver, and get paid — tracked end to end.",
    prompt: "New to Vidlix?",
    ctaLabel: "Create an account",
    ctaHref: "/signup",
  },
  signup: {
    heading: "Get discovered. Get paid.",
    body: "Join as a brand to launch campaigns, or as a creator to accept offers and get paid — with everything tracked end to end.",
    prompt: "Already have an account?",
    ctaLabel: "Log in",
    ctaHref: "/login",
  },
};

// Half the CSS transition's duration (see --auth-flip-duration in
// globals.css) — the brand panel's rotateY dips toward the side it's
// heading to for the first half of the slide, then eases back to flat
// for the second half, all on plain CSS transitions (no keyframes, no
// animation library): a genuine two-phase arc from two states, timed
// by this one setTimeout.
const FLIP_HALF_MS = 300;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const side = authSideFor(pathname);
  const prevSideRef = useRef(side);
  const [tilt, setTilt] = useState(0);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (prevSideRef.current === side) return;
    prevSideRef.current = side;
    if (reducedMotionRef.current) return; // plain cut, no rotation dip
    setTilt(side === "signup" ? 1 : -1);
    const t = setTimeout(() => setTilt(0), FLIP_HALF_MS);
    return () => clearTimeout(t);
  }, [side]);

  const copy = COPY[side];

  return (
    <div className="auth-shell" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="auth-card" style={{ perspective: 1600 }}>
        <div
          className="auth-brand-panel"
          data-side={side}
          style={{ ["--auth-tilt" as string]: `${tilt * 10}deg` } as React.CSSProperties}
        >
          <div className="auth-brand-panel-inner">
            <a href={MARKETING_URL} className="auth-brand-logo" aria-label="Vidlix home">
              <span className="auth-brand-logo-badge">
                <SparkIcon width={16} height={16} stroke="#fff" />
              </span>
              Vidlix
            </a>
            <div>
              <h2 className="auth-brand-heading">{copy.heading}</h2>
              <p className="auth-brand-body">{copy.body}</p>
            </div>
            <div className="auth-brand-switch">
              <span>{copy.prompt}</span>
              <AuthNavLink href={copy.ctaHref} className="auth-brand-switch-cta">
                {copy.ctaLabel} →
              </AuthNavLink>
            </div>
          </div>
        </div>

        <div className="auth-form-side" data-side={side}>
          <a href={MARKETING_URL} aria-label="Back to vidlix.in" title="Back to vidlix.in" className="auth-back-link">
            <ArrowLeftIcon width={17} height={17} />
          </a>
          <div className="auth-form-pane">{children}</div>
        </div>
      </div>
    </div>
  );
}
