"use client";

import { useEffect, useState } from "react";
import { Button } from "./Button";
import { CalendarIcon, CloseIcon } from "./icons";

const STORAGE_KEY = "vidlix_greeting_seen_on";

function greetingFor(hour: number): string {
  return hour >= 5 && hour < 12 ? "Good morning" : hour >= 12 && hour < 17 ? "Good afternoon" : "Good evening";
}

/**
 * The "Good morning/afternoon/evening" welcome, as a once-a-day popup
 * instead of permanent text sitting at the top of the dashboard.
 * Shown the first time the dashboard opens after local midnight;
 * closing it (or opening the dashboard again later the same day)
 * keeps it away until the next calendar day.
 */
export function GreetingModal({ name, subtitle }: { name: string; subtitle: string }) {
  const [now, setNow] = useState<Date | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const current = new Date();
    setNow(current);
    const todayKey = current.toDateString();
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== todayKey) setShow(true);
    } catch {
      // Private browsing / storage blocked — just skip the popup rather than throw.
    }
  }, []);

  function close() {
    setShow(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, (now ?? new Date()).toDateString());
    } catch {
      // Nothing to do if storage isn't available — it'll just show again next visit.
    }
  }

  if (!show || !now) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily greeting"
      onClick={close}
      style={{ position: "fixed", inset: 0, background: "rgba(15,15,20,0.45)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        className="card"
        style={{ maxWidth: 360, width: "100%", textAlign: "center", position: "relative", padding: "32px 28px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: "var(--color-text-secondary)" }}
        >
          <CloseIcon width={16} height={16} />
        </button>
        <span className="icon-badge icon-badge-blue" aria-hidden="true" style={{ width: 46, height: 46, margin: "0 auto 14px" }}>
          <CalendarIcon width={20} height={20} />
        </span>
        <h2 style={{ margin: "0 0 4px", fontSize: 19 }}>
          {greetingFor(now.getHours())}, {name} 👋
        </h2>
        <p className="helper-text" style={{ margin: "0 0 14px" }}>{subtitle}</p>
        <p style={{ margin: "0 0 20px", fontWeight: 650, fontSize: 13.5, color: "var(--color-text-secondary)" }}>
          {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
        </p>
        <Button onClick={close} style={{ width: "100%" }}>
          Let&apos;s go
        </Button>
      </div>
    </div>
  );
}
