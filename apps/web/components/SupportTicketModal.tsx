"use client";

import { useEffect, useState } from "react";
import { Button } from "./Button";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

interface TicketMessage {
  id: string;
  senderRole: string;
  body: string;
  createdAt: string;
}
interface TicketDetail {
  id: string;
  subject: string;
  status: string;
  priority: string;
  messages: TicketMessage[];
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

/** The user-facing side of a ticket thread — read every reply, send a
 * new message (which reopens the ticket if it had been resolved/
 * closed, same as replying to a "solved" email thread would). */
export function SupportTicketModal({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiFetch<TicketDetail>(`/api/support/tickets/${ticketId}`)
      .then(setTicket)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Couldn't load this ticket."));
  }
  useEffect(load, [ticketId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      await apiFetch(`/api/support/tickets/${ticketId}/messages`, { method: "POST", body: { body: draft } });
      setDraft("");
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't send that.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        className="paper-modal"
        style={{ maxWidth: 560, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {!ticket ? (
          <p className="helper-text" style={{ padding: 20 }}>{error ?? "Loading…"}</p>
        ) : (
          <>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ margin: "0 0 4px" }}>{ticket.subject}</h3>
                <span className="badge">{STATUS_LABEL[ticket.status] ?? ticket.status}</span>
              </div>
              <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)" }}>
                ×
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {ticket.messages.map((m) => {
                const mine = m.senderRole === "USER";
                return (
                  <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                    <div
                      style={{
                        background: mine ? "var(--color-primary)" : "var(--color-bg-subtle)",
                        color: mine ? "#fff" : "var(--color-text)",
                        padding: "8px 12px",
                        borderRadius: 12,
                        fontSize: 13.5,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {m.body}
                    </div>
                    <div className="helper-text" style={{ fontSize: 11, marginTop: 2, textAlign: mine ? "right" : "left" }}>
                      {mine ? "You" : "Support"} · {new Date(m.createdAt).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={send} style={{ display: "flex", gap: 8, padding: 16, borderTop: "1px solid var(--color-border)" }}>
              <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Reply…" style={{ flex: 1 }} />
              <Button type="submit" loading={sending}>Send</Button>
            </form>
            {error && <p className="error-text" style={{ padding: "0 16px 12px" }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
