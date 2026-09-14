"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { PageHeading } from "@/components/PageHeading";
import { PageLoader } from "@/components/PageLoader";
import { PasswordField } from "@/components/PasswordField";
import { SupportTicketModal } from "@/components/SupportTicketModal";
import {
  ChatIcon,
  GearIcon,
  InstagramIcon,
  LifeBuoyIcon,
  ShieldIcon,
  TrashIcon,
  UserIcon,
} from "@/components/icons";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { useConfirm } from "@/lib/useConfirm";

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || "https://vidlix.in";
const SUPPORT_EMAIL = "support@vidlix.in";

// Just two tabs — every option here does something real. (Notifications,
// Privacy and Appearance used to be their own tabs with nothing behind
// them but a "coming soon" note; Connected Apps — Instagram — is real,
// but it's account-level, so it now lives inside Account instead of
// getting its own tab for one toggle.)
const TABS = [
  { key: "account", label: "Account", icon: UserIcon },
  { key: "help", label: "Help & Support", icon: LifeBuoyIcon },
] as const;
type TabKey = (typeof TABS)[number]["key"];

interface Me {
  name: string | null;
  email: string;
  creator: { displayName: string; location: string | null } | null;
  brand: { companyName: string } | null;
}

interface InstagramStatus {
  status: "NOT_CONNECTED" | "CONNECTED" | "NEEDS_RECONNECTION" | "SYNC_FAILED";
  username?: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  updatedAt: string;
  _count: { messages: number };
}

const TICKET_STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export default function SettingsPage() {
  const confirm = useConfirm();
  const [tab, setTab] = useState<TabKey>("account");

  // Deep link, e.g. the sidebar's "Need help?" card → /settings?tab=help.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested && TABS.some((t) => t.key === requested)) setTab(requested as TabKey);
  }, []);
  const [me, setMe] = useState<Me | null>(null);
  const [instagram, setInstagram] = useState<InstagramStatus | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [disconnecting, setDisconnecting] = useState(false);

  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketPriority, setTicketPriority] = useState<"LOW" | "NORMAL" | "HIGH">("NORMAL");
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  function loadTickets() {
    apiFetch<Ticket[]>("/api/support/tickets").then(setTickets).catch(() => setTickets([]));
  }

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    setTicketError(null);
    setSubmittingTicket(true);
    try {
      await apiFetch("/api/support/tickets", {
        method: "POST",
        body: { subject: ticketSubject, description: ticketDescription, priority: ticketPriority },
      });
      setShowNewTicket(false);
      setTicketSubject("");
      setTicketDescription("");
      setTicketPriority("NORMAL");
      loadTickets();
    } catch (err) {
      setTicketError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setSubmittingTicket(false);
    }
  }

  useEffect(() => {
    apiFetch<Me>("/api/auth/me").then((m) => {
      setMe(m);
      setName(m.name ?? "");
      setLocation(m.creator?.location ?? "");
      setCompanyName(m.brand?.companyName ?? "");
      if (m.creator) {
        apiFetch<InstagramStatus>("/api/instagram").then(setInstagram).catch(() => setInstagram({ status: "NOT_CONNECTED" }));
      }
    });
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountError(null);
    setAccountSuccess(null);
    setSavingAccount(true);
    try {
      await apiFetch("/api/auth/me", { method: "PATCH", body: { name } });
      if (me?.creator) {
        await apiFetch("/api/creators/me", { method: "PATCH", body: { location } });
      } else if (me?.brand) {
        await apiFetch("/api/brands/me", { method: "PATCH", body: { companyName } });
      }
      setAccountSuccess("Account updated.");
    } catch (err) {
      setAccountError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setSavingAccount(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation don't match.");
      return;
    }
    setSavingPassword(true);
    try {
      await apiFetch("/api/auth/password/change", { method: "POST", body: { currentPassword, newPassword } });
      setPasswordSuccess("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDisconnectInstagram() {
    const confirmed = await confirm({
      title: "Disconnect Instagram?",
      description: "Brands won't be able to see updated follower/reach data until you reconnect.",
      danger: true,
      confirmLabel: "Disconnect",
    });
    if (!confirmed) return;
    setDisconnecting(true);
    try {
      const updated = await apiFetch<InstagramStatus>("/api/instagram/disconnect", { method: "POST" });
      setInstagram(updated);
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleConnectInstagram() {
    const { url } = await apiFetch<{ url: string }>("/api/instagram/authorize-url");
    window.location.href = url;
  }

  async function handleDeleteAccount() {
    const confirmed = await confirm({
      title: "Delete your account?",
      description:
        "Account deletion needs a manual review (any pending payouts or open deals have to be settled first) — this sends a request to our support team rather than deleting anything immediately.",
      danger: true,
      confirmLabel: "Request Deletion",
    });
    if (!confirmed) return;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Account deletion request")}&body=${encodeURIComponent(
      `Please delete my Vidlix account (${me?.email ?? ""}).`
    )}`;
  }

  if (!me) return <PageLoader />;

  return (
    <main style={{ padding: "32px" }}>
      <PageHeading
        icon={GearIcon}
        tint="blue"
        title="Settings"
        description="Manage your account, preferences and application settings."
      />

      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--color-border)", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              borderBottom: tab === t.key ? "2px solid var(--color-primary)" : "2px solid transparent",
              padding: "10px 14px",
              marginBottom: -1,
              fontSize: 13.5,
              fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? "var(--color-primary)" : "var(--color-text-secondary)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <t.icon width={15} height={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "account" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span className="icon-badge icon-badge-purple" aria-hidden="true"><UserIcon width={17} height={17} /></span>
              <h3 style={{ margin: 0 }}>Account Information</h3>
            </div>
            <p className="helper-text" style={{ margin: "4px 0 16px" }}>Update your basic account details.</p>
            <form onSubmit={saveAccount}>
              <label className="label">Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} style={{ marginBottom: 16 }} />

              <label className="label">Email</label>
              <input className="input" value={me.email} disabled style={{ marginBottom: 16 }} />

              {me.creator && (
                <>
                  <label className="label">Username</label>
                  <input className="input" value={`@${me.creator.displayName}`} disabled style={{ marginBottom: 16 }} />

                  <label className="label">Location</label>
                  <input
                    className="input"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter your location"
                    style={{ marginBottom: 16 }}
                  />
                </>
              )}

              {me.brand && (
                <>
                  <label className="label">Company Name</label>
                  <input
                    className="input"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter your company name"
                    style={{ marginBottom: 16 }}
                  />
                </>
              )}

              {accountError && <p className="error-text" style={{ marginBottom: 16 }}>{accountError}</p>}
              {accountSuccess && <p style={{ color: "var(--color-success)", fontSize: 13, marginBottom: 16 }}>{accountSuccess}</p>}

              <Button type="submit" loading={savingAccount}>Save Changes</Button>
            </form>
          </div>

          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span className="icon-badge icon-badge-blue" aria-hidden="true"><ShieldIcon width={17} height={17} /></span>
              <h3 style={{ margin: 0 }}>Change Password</h3>
            </div>
            <p className="helper-text" style={{ margin: "4px 0 16px" }}>Keep your account secure with a strong password.</p>
            <form onSubmit={changePassword}>
              <PasswordField
                id="currentPassword"
                label="Current Password"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
              />
              <PasswordField
                id="newPassword"
                label="New Password"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                minLength={8}
              />
              <PasswordField
                id="confirmPassword"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                minLength={8}
              />
              {passwordError && <p className="error-text" style={{ marginBottom: 16 }}>{passwordError}</p>}
              {passwordSuccess && <p style={{ color: "var(--color-success)", fontSize: 13, marginBottom: 16 }}>{passwordSuccess}</p>}
              <Button type="submit" loading={savingPassword}>Update Password</Button>
            </form>
          </div>

          {me.creator && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span className="icon-badge icon-badge-pink" aria-hidden="true"><InstagramIcon width={17} height={17} /></span>
                <h3 style={{ margin: 0 }}>Instagram</h3>
              </div>
              <p className="helper-text" style={{ margin: "4px 0 16px" }}>Brands see your follower and reach numbers through this connection.</p>
              {!instagram ? (
                <PageLoader />
              ) : instagram.status === "CONNECTED" ? (
                <>
                  <p style={{ margin: "0 0 16px" }}>
                    Connected as <strong>@{instagram.username}</strong> <span className="badge badge-success">Connected</span>
                  </p>
                  <Button variant="danger" onClick={handleDisconnectInstagram} loading={disconnecting}>Disconnect</Button>
                </>
              ) : (
                <>
                  <p className="helper-text" style={{ margin: "0 0 16px" }}>
                    {instagram.status === "NOT_CONNECTED" ? "Not connected." : "Disconnected — reconnect to sync data again."}
                  </p>
                  <Button onClick={handleConnectInstagram}>Connect Instagram</Button>
                </>
              )}
            </div>
          )}

          <div className="card" style={{ borderColor: "var(--color-danger)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span className="icon-badge" style={{ background: "var(--color-danger-soft)", color: "var(--color-danger)" }} aria-hidden="true">
                <TrashIcon width={17} height={17} />
              </span>
              <h3 style={{ margin: 0 }}>Danger Zone</h3>
            </div>
            <p className="helper-text" style={{ margin: "4px 0 16px" }}>
              Account deletion goes through a manual review (pending payouts/deals need settling first) — this sends a
              request to support rather than deleting anything immediately.
            </p>
            <Button variant="danger" onClick={handleDeleteAccount}>Request Account Deletion</Button>
          </div>
        </div>
      )}

      {tab === "help" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          <div className="card" style={{ maxWidth: 480 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span className="icon-badge icon-badge-green" aria-hidden="true"><LifeBuoyIcon width={17} height={17} /></span>
              <h3 style={{ margin: 0 }}>Help &amp; Support</h3>
            </div>
            <p className="helper-text" style={{ margin: "4px 0 16px" }}>Get help or report a problem.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href={`${MARKETING_URL}/contact`} target="_blank" rel="noreferrer" className="account-menu-item" style={{ background: "var(--color-bg-subtle)" }}>
                Contact support
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="account-menu-item" style={{ background: "var(--color-bg-subtle)" }}>
                Email {SUPPORT_EMAIL}
              </a>
              <a href={`${MARKETING_URL}/faq`} target="_blank" rel="noreferrer" className="account-menu-item" style={{ background: "var(--color-bg-subtle)" }}>
                FAQ
              </a>
            </div>
          </div>

          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="icon-badge icon-badge-purple" aria-hidden="true"><ChatIcon width={17} height={17} /></span>
                <h3 style={{ margin: 0 }}>My Tickets</h3>
              </div>
              <Button onClick={() => setShowNewTicket(true)}>+ Raise a Ticket</Button>
            </div>
            <p className="helper-text" style={{ margin: "4px 0 16px" }}>
              Ran into a problem? Raise a ticket and see our replies here.
            </p>

            {showNewTicket && (
              <form onSubmit={submitTicket} className="card" style={{ marginBottom: 16, background: "var(--color-bg-subtle)" }}>
                <label className="label">Subject</label>
                <input
                  className="input"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="Briefly describe the issue"
                  required
                  style={{ marginBottom: 12 }}
                />
                <label className="label">Description</label>
                <textarea
                  className="input"
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  placeholder="What's going wrong? Include any details that would help us."
                  required
                  style={{ marginBottom: 12, minHeight: 90, resize: "vertical", fontFamily: "inherit" }}
                />
                <label className="label">Priority</label>
                <select
                  className="input"
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value as "LOW" | "NORMAL" | "HIGH")}
                  style={{ marginBottom: 12 }}
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                </select>
                {ticketError && <p className="error-text" style={{ marginBottom: 12 }}>{ticketError}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <Button type="submit" loading={submittingTicket}>Submit</Button>
                  <Button type="button" variant="secondary" onClick={() => setShowNewTicket(false)}>Cancel</Button>
                </div>
              </form>
            )}

            {!tickets ? (
              <PageLoader />
            ) : tickets.length === 0 ? (
              <p className="helper-text" style={{ margin: 0 }}>No tickets yet — raise one if something's not working.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setOpenTicketId(t.id)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      borderBottom: "1px solid var(--color-border)",
                      padding: "10px 4px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</div>
                      <div className="helper-text">
                        {t._count.messages} message{t._count.messages === 1 ? "" : "s"} · {new Date(t.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="badge" style={{ flexShrink: 0 }}>{TICKET_STATUS_LABEL[t.status] ?? t.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {openTicketId && <SupportTicketModal ticketId={openTicketId} onClose={() => { setOpenTicketId(null); loadTickets(); }} />}
    </main>
  );
}
