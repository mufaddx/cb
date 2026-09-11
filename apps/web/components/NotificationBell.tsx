"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/apiClient";
import { BellIcon } from "./icons";

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

/**
 * Real notification center — the Notification model and its full
 * list/unread-count/mark-read/mark-all-read API already existed with
 * no UI anywhere calling any of it. Polls the unread count so the
 * badge stays current without needing the dropdown open.
 */
export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function loadCount() {
    apiFetch<{ count: number }>("/api/notifications/unread-count")
      .then((r) => setCount(r.count))
      .catch(() => null);
  }

  useEffect(() => {
    loadCount();
    const timer = setInterval(loadCount, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    apiFetch<Notif[]>("/api/notifications").then(setItems).catch(() => setItems([]));
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
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
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        style={{ position: "relative", background: "none", border: "none", padding: 8, display: "flex", borderRadius: 8, color: "var(--color-text)", cursor: "pointer" }}
      >
        <BellIcon width={19} height={19} />
        {count > 0 && (
          <span
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

      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 320,
            maxHeight: 420,
            overflowY: "auto",
            padding: 0,
            zIndex: 200,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid var(--color-border)" }}>
            <strong style={{ fontSize: 13.5 }}>Notifications</strong>
            {count > 0 && (
              <button onClick={markAllRead} style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Mark all read
              </button>
            )}
          </div>
          {!items ? (
            <p className="helper-text" style={{ padding: 14, margin: 0 }}>Loading…</p>
          ) : items.length === 0 ? (
            <p className="helper-text" style={{ padding: 14, margin: 0 }}>No notifications yet.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: n.readAt ? "transparent" : "var(--color-primary-soft)",
                  border: "none",
                  borderBottom: "1px solid var(--color-border)",
                  padding: "10px 14px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{n.body}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-faint)", marginTop: 4 }}>{new Date(n.createdAt).toLocaleString()}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
