"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import { ArrowLeftIcon } from "../../../components/icons";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  updatedAt: string;
  user: { email: string; name: string | null } | null;
  _count: { messages: number };
}
interface TicketMessage {
  id: string;
  senderRole: string;
  body: string;
  createdAt: string;
}
interface TicketDetail extends Ticket {
  messages: TicketMessage[];
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};
const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadQueue() {
    apiFetch<Ticket[]>("/api/support/tickets/queue")
      .then(setTickets)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load tickets."));
  }
  useEffect(loadQueue, []);

  function loadTicket() {
    if (!activeId) return;
    apiFetch<TicketDetail>(`/api/support/tickets/${activeId}/admin`).then(setTicket).catch(() => setTicket(null));
  }
  useEffect(() => {
    setTicket(null);
    loadTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      await apiFetch(`/api/support/tickets/${activeId}/admin/messages`, { method: "POST", body: { body: draft } });
      setDraft("");
      loadTicket();
      loadQueue();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't send that.");
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(status: string) {
    if (!activeId) return;
    setUpdatingStatus(true);
    try {
      await apiFetch(`/api/support/tickets/${activeId}/status`, { method: "PATCH", body: { status } });
      loadTicket();
      loadQueue();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't update status.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (error && !tickets) return <p className="error-text">{error}</p>;
  if (!tickets) return <p>Loading…</p>;

  return (
    <div className={`chat-grid${activeId ? " chat-has-active" : ""}`} style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, minHeight: "calc(100vh - 180px)" }}>
      <div className="card chat-list-pane" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 16px", fontWeight: 700, fontSize: 14 }}>Tickets ({tickets.length})</div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {tickets.length === 0 ? (
            <p className="helper-text" style={{ padding: 16 }}>No tickets yet.</p>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: activeId === t.id ? "var(--color-primary-soft)" : "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--color-border)",
                  padding: "12px 16px",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>{t.subject}</span>
                  <span className="badge">{STATUS_LABEL[t.status] ?? t.status}</span>
                </div>
                <div className="helper-text">{t.user?.email ?? "—"} · {t._count.messages} msg</div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="card chat-thread-pane" style={{ display: "flex", flexDirection: "column", padding: 0 }}>
        {!activeId ? (
          <p className="helper-text" style={{ padding: 16 }}>Select a ticket.</p>
        ) : !ticket ? (
          <p className="helper-text" style={{ padding: 16 }}>Loading…</p>
        ) : (
          <>
            <button
              type="button"
              className="mobile-only"
              onClick={() => setActiveId(null)}
              style={{
                alignItems: "center",
                gap: 8,
                border: "none",
                borderBottom: "1px solid var(--color-border)",
                background: "none",
                padding: "12px 16px",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <ArrowLeftIcon width={16} height={16} style={{ flexShrink: 0 }} />
              Back to tickets
            </button>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{ticket.subject}</div>
                <div className="helper-text">{ticket.user?.email ?? "—"} · Priority: {ticket.priority}</div>
              </div>
              <select
                className="input"
                value={ticket.status}
                onChange={(e) => changeStatus(e.target.value)}
                disabled={updatingStatus}
                style={{ width: "auto", minWidth: 140 }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {ticket.messages.map((m) => {
                const fromAdmin = m.senderRole === "ADMIN";
                return (
                  <div key={m.id} style={{ alignSelf: fromAdmin ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                    <div
                      style={{
                        background: fromAdmin ? "var(--color-primary)" : "var(--color-bg-subtle)",
                        color: fromAdmin ? "#fff" : "var(--color-text)",
                        padding: "8px 12px",
                        borderRadius: 12,
                        fontSize: 13.5,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {m.body}
                    </div>
                    <div className="helper-text" style={{ fontSize: 11, marginTop: 2, textAlign: fromAdmin ? "right" : "left" }}>
                      {fromAdmin ? "Support" : "User"} · {new Date(m.createdAt).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
            {error && <p className="error-text" style={{ padding: "0 16px" }}>{error}</p>}
            <form onSubmit={reply} style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--color-border)" }}>
              <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Reply…" style={{ flex: 1 }} />
              <Button type="submit" loading={sending}>Send</Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
