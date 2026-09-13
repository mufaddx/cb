"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "../lib/apiClient";
import { BellIcon, CloseIcon } from "./icons";
import "../styles/notifications.css";

export interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

/** Fired after anything marks notifications read (drawer or the
 * /notifications page) so every bell badge refreshes immediately
 * instead of waiting for its next poll. */
export const NOTIFICATIONS_CHANGED = "vidlix:notifications-changed";

export function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function NotificationItem({ n, onRead }: { n: Notif; onRead: (id: string) => void }) {
  const unread = !n.readAt;
  return (
    <button
      type="button"
      onClick={() => onRead(n.id)}
      className={`notif-item${unread ? " is-unread" : ""}`}
      aria-label={`${unread ? "Unread: " : ""}${n.title}`}
    >
      <span className="notif-dot" aria-hidden="true" />
      <span style={{ minWidth: 0, flex: 1 }}>
        <span className="notif-title">{n.title}</span>
        <span className="notif-body">{n.body}</span>
        <span className="notif-time">{timeAgo(n.createdAt)}</span>
      </span>
    </button>
  );
}

export function NotificationEmpty({ unreadOnly }: { unreadOnly: boolean }) {
  return (
    <div className="notif-empty">
      <span className="notif-empty-icon" aria-hidden="true">
        <BellIcon width={22} height={22} />
      </span>
      <strong>{unreadOnly ? "No unread notifications" : "No notifications yet"}</strong>
      <span>Updates about your campaigns, offers and payments will show up here.</span>
    </div>
  );
}

/**
 * Bell + slide-in notification drawer. The drawer is portalled into the
 * page's shell element rather than rendered inside the header — the
 * header uses backdrop-filter, which would otherwise trap a
 * position:fixed panel inside the header's own box.
 * `allHref` adds a "View all notifications" link (brand/creator app);
 * the admin console has no such page, so it omits it.
 */
export function NotificationBell({ allHref }: { allHref?: string }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [items, setItems] = useState<Notif[] | null>(null);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);

  function loadCount() {
    apiFetch<{ count: number }>("/api/notifications/unread-count")
      .then((r) => setCount(r.count))
      .catch(() => null);
  }

  useEffect(() => {
    setPortalTarget(document.querySelector(".app-shell, .admin-shell") ?? document.body);
    loadCount();
    const timer = setInterval(loadCount, 60_000);
    window.addEventListener(NOTIFICATIONS_CHANGED, loadCount);
    return () => {
      clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_CHANGED, loadCount);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setItems(null);
    apiFetch<Notif[]>("/api/notifications").then(setItems).catch(() => setItems([]));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  async function markRead(id: string) {
    setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)) ?? null);
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
    } finally {
      loadCount();
    }
  }

  async function markAllRead() {
    setItems((prev) => prev?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? null);
    setCount(0);
    await apiFetch("/api/notifications/mark-all-read", { method: "POST" }).catch(() => null);
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
  }

  const visible = filter === "unread" ? items?.filter((n) => !n.readAt) : items;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{ position: "relative", background: "none", border: "none", padding: 8, display: "flex", borderRadius: 8, color: "var(--color-text)", cursor: "pointer" }}
      >
        <BellIcon width={19} height={19} />
        {count > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 3,
              right: 3,
              minWidth: 15,
              height: 15,
              padding: "0 3px",
              borderRadius: 8,
              background: "var(--color-danger)",
              color: "#fff",
              fontSize: 9.5,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open &&
        portalTarget &&
        createPortal(
          <div className="notif-layer">
            <div className="notif-backdrop" onClick={() => setOpen(false)} />
            <aside className="notif-drawer" role="dialog" aria-modal="true" aria-labelledby="notif-drawer-title">
              <div className="notif-head">
                <div>
                  <h2 id="notif-drawer-title" className="notif-heading">
                    Notifications
                  </h2>
                  <p className="notif-sub">{count > 0 ? `${count} unread` : "You're all caught up"}</p>
                </div>
                <button type="button" className="notif-close" onClick={() => setOpen(false)} aria-label="Close notifications" autoFocus>
                  <CloseIcon width={18} height={18} />
                </button>
              </div>

              <div className="notif-toolbar">
                <div className="notif-tabs" role="tablist" aria-label="Filter notifications">
                  {(["all", "unread"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      role="tab"
                      aria-selected={filter === f}
                      className={`notif-tab${filter === f ? " is-active" : ""}`}
                      onClick={() => setFilter(f)}
                    >
                      {f === "all" ? "All" : "Unread"}
                    </button>
                  ))}
                </div>
                {count > 0 && (
                  <button type="button" className="notif-link-btn" onClick={markAllRead}>
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="notif-list">
                {!visible ? (
                  <p className="notif-empty">Loading…</p>
                ) : visible.length === 0 ? (
                  <NotificationEmpty unreadOnly={filter === "unread"} />
                ) : (
                  visible.map((n) => <NotificationItem key={n.id} n={n} onRead={markRead} />)
                )}
              </div>

              {allHref && (
                <div className="notif-foot">
                  <Link href={allHref} className="notif-all" onClick={() => setOpen(false)}>
                    View all notifications
                  </Link>
                </div>
              )}
            </aside>
          </div>,
          portalTarget
        )}
    </>
  );
}
