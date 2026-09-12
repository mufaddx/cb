"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authSideFor } from "@/lib/authSide";

// A real <a href> (works with no JS, cmd/ctrl-click, screen readers)
// that — once hydrated, and only if the browser supports it and the
// visitor hasn't asked for reduced motion — wraps the actual
// navigation in the native View Transitions API so the auth card's
// content pane (see .auth-form-pane in globals.css) morphs instead of
// hard-cutting to the new page. Falls back to a completely normal
// client-side navigation everywhere else; nothing about the auth flow
// itself depends on this succeeding.
type ViewTransition = { finished: Promise<void> };
type MaybeViewTransitionDocument = Document & { startViewTransition?: (cb: () => void) => ViewTransition };

export function AuthNavLink({
  href,
  children,
  className,
  style,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Let modifier-clicks (new tab/window) and non-primary buttons
    // behave exactly like a normal link — only intercept a plain
    // left-click navigation.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();

    const navigate = () => router.push(href);
    const doc = document as MaybeViewTransitionDocument;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reducedMotion) {
      navigate();
      return;
    }

    // Which way the card should visually slide — a data attribute the
    // ::view-transition-old/new keyframes key off (see globals.css) —
    // cleared once the transition finishes so it doesn't leak into
    // whatever the next, unrelated transition turns out to be.
    const fromSide = authSideFor(pathname);
    const toSide = authSideFor(href);
    if (fromSide !== toSide) {
      document.documentElement.setAttribute("data-auth-direction", toSide === "signup" ? "forward" : "back");
    }
    const transition = doc.startViewTransition(navigate);
    transition.finished.finally(() => document.documentElement.removeAttribute("data-auth-direction"));
  }

  return (
    <a href={href} onClick={handleClick} className={className} style={style}>
      {children}
    </a>
  );
}
