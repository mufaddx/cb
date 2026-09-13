"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import { PageLoader } from "../../../components/PageLoader";
import { AdminIntro, DemoBanner, DemoTag, StatusBadge, formatDate } from "../../../components/admin/AdminUI";
import { ArrowLeftIcon, LifeBuoyIcon } from "../../../components/icons";
import { apiFetch, ApiClientError } from "../../../lib/apiClient";
import { DEMO_TICKETS, DEMO_TICKET_MESSAGES, isDemoId, withDemo } from "../../../lib/adminDemo";

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
  const [loadError, setLoadError] = useState(false);

  function loadQueue() {
    apiFetch<Ticket[]>("/api/support/tickets/queue")
      .then(setTickets)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Failed to load tickets.");
        setLoadError(true);
        setTickets([]);
      });
  }
  useEffect(loadQueue, []);

  function loadTicket() {
    if (!activeId) return;
    if (isDemoId(activeId)) {
      // Demo tickets never hit the API — their thread comes from the demo file.
      const demo = DEMO_TICKETS.find((t) => t.id === activeId);
      setTicket(demo ? { ...demo, messages: DEMO_TICKET_MESSAGES[activeId] ?? [] } : null);
      return;
    }
    apiFetch<TicketDetail>(`/api/support/tickets/${activeId}/admin`).then(setTicket).catch(() => setTicket(null));
  }
  useEffect(() => {
    setTicket(null);
    loadTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !draft.trim() || isDemoId(activeId)) return;
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
    if (!activeId || isDemoId(activeId)) return;
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

  const { items, isDemo } = withDemo(tickets, DEMO_TICKETS, { allow: !loadError });
  if (!items) return <PageLoader />;

  const openCount = isDemo ? 0 : items.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
  const demoActive = activeId ? isDemoId(activeId) : false;

  return (
    <div className="adm-stack">
      <AdminIntro icon={LifeBuoyIcon} tint="blue" meta={<span className="adm-chip">{openCount} open</span>}>
        Questions and problems brands and creators raise from their Help &amp; Support page. Open a ticket to read the
        conversation, reply, and update its status.
      </AdminIntro>
      <DemoBanner show={isDemo} />
      {error && <p className="error-text">{error}</p>}

      <div
        className={`chat-grid${activeId ? " chat-has-active" : ""}`}
        style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, minHeight: "max(460px, calc(100vh - 320px))" }}
      >
        <div className="adm-panel chat-list-pane" style={{ display: "flex", flexDirection: "column" }}>
          <div className="adm-panel-head">
            <h3>Tickets</h3>
            <span className="adm-chip">{isDemo ? 0 : items.length}</span>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {items.length === 0 ? (
              <p className="adm-panel-empty">No tickets yet. New tickets from brands and creators appear here.</p>
            ) : (
              items.map((t) => (
                <button
                  key={t.id}
                  type="button"
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
                    font: "inherit",
                    color: "var(--color-text)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontWeight: 650, fontSize: 14 }}>{t.subject}</span>
                    <StatusBadge status={t.status} label={STATUS_LABEL[t.status]} />
                  </div>
                  <div className="helper-text" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span>{t.user?.name ?? t.user?.email ?? "—"}</span>
                    <span>· {t._count.messages} msg</span>
                    <span>· {formatDate(t.updatedAt)}</span>
                    {isDemoId(t.id) && <DemoTag />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="adm-panel chat-thread-pane" style={{ display: "flex", flexDirection: "column" }}>
          {!activeId ? (
            <p className="adm-panel-empty" style={{ margin: "auto", textAlign: "center" }}>
              Select a ticket to read and reply.
            </p>
          ) : !ticket ? (
            <p className="adm-panel-empty">Loading…</p>
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
              <div className="adm-panel-head" style={{ flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <h3>{ticket.subject}</h3>
                    {demoActive && <DemoTag />}
                  </div>
                  <div className="helper-text" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                    <span>{ticket.user?.email ?? "—"}</span>
                    <StatusBadge status={ticket.priority} label={`${ticket.priority.charAt(0)}${ticket.priority.slice(1).toLowerCase()} priority`} />
                  </div>
                </div>
                <select
                  className="input"
                  value={ticket.status}
                  onChange={(e) => changeStatus(e.target.value)}
                  disabled={updatingStatus || demoActive}
                  aria-label="Ticket status"
                  style={{ width: "auto", minWidth: 150 }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {ticket.messages.map((m) => {
                  const fromAdmin = m.senderRole === "ADMIN";
                  return (
                    <div key={m.id} style={{ alignSelf: fromAdmin ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                      <div
                        style={{
                          background: fromAdmin ? "var(--color-primary)" : "var(--color-bg-subtle)",
                          color: fromAdmin ? "#fff" : "var(--color-text)",
                          border: fromAdmin ? "none" : "1px solid var(--color-border)",
                          padding: "9px 13px",
                          borderRadius: 12,
                          fontSize: 13.5,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {m.body}
                      </div>
                      <div className="helper-text" style={{ fontSize: 11, marginTop: 3, textAlign: fromAdmin ? "right" : "left" }}>
                        {fromAdmin ? "Support" : "User"} · {new Date(m.createdAt).toLocaleString("en-IN")}
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={reply} style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--color-border)" }}>
                <input
                  className="input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={demoActive ? "Demo ticket — replies are disabled" : "Write a reply…"}
                  disabled={demoActive}
                  aria-label="Reply"
                  style={{ flex: 1 }}
                />
                <Button type="submit" loading={sending} disabled={demoActive || !draft.trim()}>
                  Send
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
