"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, clearTokens } from "@/lib/apiClient";
import { ChevronDownIcon, GearIcon, LogOutIcon, UserIcon } from "@/components/icons";

/** Avatar + chevron in the header, opening a small menu (Profile,
 * Settings, Log out) — the same click-away dropdown pattern
 * NotificationBell already uses. The account footer already in the
 * sidebar (name/role/logout) is untouched; this is an additional,
 * faster way to reach the same actions from the header, matching
 * where the reference screenshots put them. */
export function AccountMenu({ initial, settingsHref }: { initial: string; settingsHref?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  function logout() {
    apiFetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    clearTokens();
    router.push("/login");
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          padding: "4px 6px 4px 4px",
          borderRadius: 10,
          cursor: "pointer",
          color: "var(--color-text)",
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "var(--gradient-brand)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12.5,
            fontWeight: 700,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {initial}
        </span>
        <ChevronDownIcon width={15} height={15} style={{ color: "var(--color-text-secondary)" }} />
      </button>

      {open && (
        <div
          className="paper-modal"
          style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 190, padding: 6, zIndex: 200 }}
        >
          <Link href="/profile" onClick={() => setOpen(false)} className="account-menu-item">
            <UserIcon width={16} height={16} /> Profile
          </Link>
          {settingsHref && (
            <Link href={settingsHref} onClick={() => setOpen(false)} className="account-menu-item">
              <GearIcon width={16} height={16} /> Settings
            </Link>
          )}
          <button onClick={logout} className="account-menu-item account-menu-item-danger">
            <LogOutIcon width={16} height={16} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
