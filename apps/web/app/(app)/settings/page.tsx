"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { PageHeading } from "@/components/PageHeading";
import { PageLoader } from "@/components/PageLoader";
import { PasswordField } from "@/components/PasswordField";
import {
  BellIcon,
  GearIcon,
  InstagramIcon,
  LifeBuoyIcon,
  LinkIcon,
  PaletteIcon,
  ShieldIcon,
  TrashIcon,
  UserIcon,
} from "@/components/icons";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { useConfirm } from "@/lib/useConfirm";

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || "https://vidlix.in";
const SUPPORT_EMAIL = "support@vidlix.in";

const TABS = [
  { key: "account", label: "Account", icon: UserIcon },
  { key: "notifications", label: "Notifications", icon: BellIcon },
  { key: "privacy", label: "Privacy", icon: ShieldIcon },
  { key: "apps", label: "Connected Apps", icon: LinkIcon },
  { key: "appearance", label: "Appearance", icon: PaletteIcon },
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

/** A section that's visually in place (matching the reference layout)
 * but genuinely has no backend behind it yet — shown honestly as
 * "coming soon" rather than a toggle that silently does nothing. */
function ComingSoon({ text }: { text: string }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: 32 }}>
      <p className="helper-text" style={{ margin: 0 }}>{text}</p>
    </div>
  );
}

export default function SettingsPage() {
  const confirm = useConfirm();
  const [tab, setTab] = useState<TabKey>("account");
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

      {tab === "notifications" && (
        <ComingSoon text="Per-notification email preferences aren't available yet — you'll still get the notifications already built into the app (offers, messages) via the bell icon." />
      )}

      {tab === "privacy" && (
        <ComingSoon text="Profile visibility and data controls aren't available yet. For a copy of your data or a privacy request, contact support." />
      )}

      {tab === "apps" && !me.creator && (
        <ComingSoon text="Instagram connection is a creator feature — there's nothing for a brand account to connect here yet." />
      )}

      {tab === "apps" && me.creator && (
        <div className="card" style={{ maxWidth: 480 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span className="icon-badge icon-badge-pink" aria-hidden="true"><InstagramIcon width={17} height={17} /></span>
            <h3 style={{ margin: 0 }}>Instagram</h3>
          </div>
          {!instagram ? (
            <PageLoader />
          ) : instagram.status === "CONNECTED" ? (
            <>
              <p style={{ margin: "8px 0 16px" }}>
                Connected as <strong>@{instagram.username}</strong> <span className="badge badge-success">Connected</span>
              </p>
              <Button variant="danger" onClick={handleDisconnectInstagram} loading={disconnecting}>Disconnect</Button>
            </>
          ) : (
            <>
              <p className="helper-text" style={{ margin: "8px 0 16px" }}>
                {instagram.status === "NOT_CONNECTED" ? "Not connected." : "Disconnected — reconnect to sync data again."}
              </p>
              <Button onClick={handleConnectInstagram}>Connect Instagram</Button>
            </>
          )}
        </div>
      )}

      {tab === "appearance" && <ComingSoon text="Vidlix only offers the current look for now — a theme option may come later." />}

      {tab === "help" && (
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
      )}
    </main>
  );
}
