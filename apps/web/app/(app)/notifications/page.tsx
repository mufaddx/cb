"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { NOTIFICATIONS_CHANGED, NotificationEmpty, NotificationItem, type Notif } from "@/components/NotificationBell";
import { PageLoader } from "@/components/PageLoader";
import { apiFetch } from "@/lib/apiClient";

export default function NotificationsPage() {
  const [items, setItems] = useState<Notif[] | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    apiFetch<Notif[]>("/api/notifications")
      .then(setItems)
      .catch(() => setError("Couldn't load your notifications. Please refresh and try again."));
  }, []);

  async function markRead(id: string) {
    setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)) ?? null);
    await apiFetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => null);
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
  }

  async function markAllRead() {
    setMarkingAll(true);
    setItems((prev) => prev?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? null);
    await apiFetch("/api/notifications/mark-all-read", { method: "POST" }).catch(() => null);
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    setMarkingAll(false);
  }

  if (error) {
    return (
      <main style={{ padding: 32 }}>
        <p className="error-text">{error}</p>
      </main>
    );
  }
  if (!items) return <PageLoader />;

  const unreadCount = items.filter((n) => !n.readAt).length;
  const visible = filter === "unread" ? items.filter((n) => !n.readAt) : items;

  return (
    <main style={{ padding: 32 }}>
      <div className="notif-page-toolbar">
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
              {f === "all" ? `All (${items.length})` : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" loading={markingAll} onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {visible.length === 0 ? (
          <NotificationEmpty unreadOnly={filter === "unread"} />
        ) : (
          visible.map((n) => <NotificationItem key={n.id} n={n} onRead={markRead} />)
        )}
      </div>
    </main>
  );
}
