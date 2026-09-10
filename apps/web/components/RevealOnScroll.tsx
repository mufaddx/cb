"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Wraps content that should fade/slide into view the first time it
 * scrolls into the viewport. Pure IntersectionObserver + a CSS class
 * toggle (see `.reveal`/`.is-visible` in globals.css) — no animation
 * library. `delayMs` staggers a group of siblings without needing a
 * parent orchestrator.
 */
export function RevealOnScroll({
  children,
  delayMs = 0,
  className,
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          window.setTimeout(() => setVisible(true), delayMs);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delayMs]);

  return (
    <div ref={ref} className={["reveal", visible ? "is-visible" : "", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
