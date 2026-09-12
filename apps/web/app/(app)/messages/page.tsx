"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { Button } from "@/components/Button";
import { PageHeading } from "@/components/PageHeading";
import { SearchIcon, SendIcon, ChatIcon } from "@/components/icons";

interface Conversation {
  id: string;
  brand: { companyName: string };
  creator: { displayName: string };
  messages: Array<{ body: string; createdAt: string }>;
}
interface DirectMessage {
  id: string;
  senderType: string;
  body: string;
  createdAt: string;
}
interface Me {
  brand: unknown;
  creator: unknown;
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesContent />
    </Suspense>
  );
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const [accountType, setAccountType] = useState<"BRAND" | "CREATOR" | null>(null);
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(searchParams.get("id"));
  const [messages, setMessages] = useState<DirectMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [convSearch, setConvSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Me>("/api/auth/me").then((me) => setAccountType(me.brand ? "BRAND" : "CREATOR")).catch(() => null);
  }, []);

  function loadConversations() {
    apiFetch<Conversation[]>("/api/conversations")
      .then((list) => {
        setConversations(list);
        setActiveId((prev) => prev ?? list[0]?.id ?? null);
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load conversations."));
  }
  useEffect(() => {
    loadConversations();
    const timer = setInterval(loadConversations, 15_000);
    return () => clearInterval(timer);
  }, []);

  function loadMessages() {
    if (!activeId) return;
    apiFetch<DirectMessage[]>(`/api/conversations/${activeId}/messages`).then(setMessages).catch(() => null);
  }
  useEffect(() => {
    setMessages(null);
    if (!activeId) return;
    loadMessages();
    const timer = setInterval(loadMessages, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    setSending(true);
    try {
      await apiFetch(`/api/conversations/${activeId}/messages`, { method: "POST", body: { body: draft } });
      setDraft("");
      loadMessages();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't send that.");
    } finally {
      setSending(false);
    }
  }

  if (error) return <main style={{ padding: 32 }}><p className="error-text">{error}</p></main>;

  const isCreator = accountType === "CREATOR";
  const filteredConversations = conversations?.filter((c) => {
    if (!convSearch.trim()) return true;
    const other = accountType === "BRAND" ? c.creator.displayName : c.brand.companyName;
    return other.toLowerCase().includes(convSearch.trim().toLowerCase());
  });

  return (
    <main style={{ padding: 32 }}>
      {isCreator && (
        <PageHeading
          icon={ChatIcon}
          tint="purple"
          title="Messages"
          description="Connect, collaborate and grow with brands and creators."
        />
      )}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, minHeight: "calc(100vh - 180px)" }}>
      <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 16px", fontWeight: 700, fontSize: 14 }}>Conversations</div>
        {isCreator && conversations && conversations.length > 0 && (
          <div style={{ padding: "0 12px 10px", position: "relative" }}>
            <SearchIcon width={14} height={14} style={{ position: "absolute", left: 22, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-faint)" }} />
            <input
              className="input"
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              placeholder="Search conversations…"
              style={{ height: 34, fontSize: 13, paddingLeft: 32 }}
            />
          </div>
        )}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {!conversations ? (
            <p className="helper-text" style={{ padding: 16 }}>Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="helper-text" style={{ padding: 16 }}>
              {accountType === "BRAND" ? "Start a chat from Top Creators." : "No conversations yet."}
            </p>
          ) : filteredConversations && filteredConversations.length === 0 ? (
            <p className="helper-text" style={{ padding: 16 }}>No conversations match &quot;{convSearch}&quot;.</p>
          ) : (
            filteredConversations?.map((c) => {
              const other = accountType === "BRAND" ? c.creator.displayName : c.brand.companyName;
              const last = c.messages[0];
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    textAlign: "left",
                    background: activeId === c.id ? "var(--color-primary-soft)" : "transparent",
                    border: "none",
                    padding: "12px 16px",
                    cursor: "pointer",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "var(--gradient-brand)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {other.charAt(0).toUpperCase()}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{other}</div>
                    {last && (
                      <div className="helper-text" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {last.body}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0 }}>
        {!activeId ? (
          <p className="helper-text" style={{ padding: 16 }}>Select a conversation.</p>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {!messages ? (
                <p className="helper-text">Loading…</p>
              ) : messages.length === 0 ? (
                <p className="helper-text">Say hello.</p>
              ) : (
                messages.map((m) => {
                  const mine = accountType === m.senderType;
                  return (
                    <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                      <div
                        style={{
                          background: mine ? "var(--color-primary)" : "var(--color-bg-subtle)",
                          color: mine ? "#fff" : "var(--color-text)",
                          padding: "8px 12px",
                          borderRadius: 12,
                          fontSize: 13.5,
                        }}
                      >
                        {m.body}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <form onSubmit={send} style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--color-border)" }}>
              <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message…" style={{ flex: 1 }} />
              <Button type="submit" loading={sending}>
                <SendIcon width={15} height={15} /> Send
              </Button>
            </form>
          </>
        )}
      </div>
      </div>
    </main>
  );
}
