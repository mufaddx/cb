import type { ReactNode, SVGProps } from "react";

type Icon = (props: SVGProps<SVGSVGElement>) => JSX.Element;
export type Tint = "purple" | "blue" | "green" | "pink" | "amber";

/** One line at the top of an admin page saying what the page is for
 * (the page title itself is already in the shared header). */
export function AdminIntro({ icon: IconCmp, tint, children, meta }: { icon: Icon; tint: Tint; children: ReactNode; meta?: ReactNode }) {
  return (
    <div className="adm-intro">
      <span className={`icon-badge icon-badge-${tint}`} aria-hidden="true">
        <IconCmp width={18} height={18} />
      </span>
      <p>{children}</p>
      {meta && <div className="adm-intro-meta">{meta}</div>}
    </div>
  );
}

export function DemoBanner({ show, children }: { show: boolean; children?: ReactNode }) {
  if (!show) return null;
  return (
    <div className="adm-demo-banner" role="note">
      <span className="adm-demo-tag">Demo</span>
      <span>
        {children ?? (
          <>
            <strong>Sample data for preview.</strong> There are no real records here yet, so example rows show what this page
            looks like. Actions on demo rows are disabled and nothing is saved.
          </>
        )}
      </span>
    </div>
  );
}

export function DemoTag({ label = "Demo" }: { label?: string }) {
  return <span className="adm-demo-tag">{label}</span>;
}

const ACRONYMS = new Set(["PAN", "UPI", "GST", "KYC", "IN", "ID", "URL", "UTR", "GMV"]);

/** "UNDER_REVIEW" → "Under Review", keeping short codes like PAN/UPI/GST upper-case. */
export function humanize(value: string): string {
  return value
    .split("_")
    .map((w) => (ACRONYMS.has(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

type Tone = "amber" | "green" | "red" | "blue" | "gray";
const STATUS_TONE: Record<string, Tone> = {
  REQUESTED: "amber",
  PENDING: "amber",
  OPEN: "amber",
  SUBMITTED: "amber",
  UNDER_REVIEW: "amber",
  PENDING_REVIEW: "amber",
  PAYMENT_PENDING: "amber",
  RESUBMISSION_REQUIRED: "amber",
  NOT_STARTED: "amber",
  HIGH: "red",
  MEDIUM: "amber",
  LOW: "gray",
  APPROVED: "green",
  VERIFIED: "green",
  PAID: "green",
  COMPLETED: "green",
  RESOLVED: "green",
  LIVE: "green",
  PASS: "green",
  PASSED: "green",
  CONNECTED: "green",
  CLEARED: "green",
  AVAILABLE: "green",
  ACTIVE: "green",
  REJECTED: "red",
  FAILED: "red",
  FAIL: "red",
  RESTRICTED: "red",
  CANCELLED: "red",
  REFUNDED: "red",
  NEEDS_RECONNECTION: "red",
  SYNC_FAILED: "red",
  PAUSED: "red",
  IN_PROGRESS: "blue",
  EVIDENCE_REQUESTED: "blue",
  MATCHING: "blue",
  PARTIALLY_REFUNDED: "blue",
  PROCESSING: "blue",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = STATUS_TONE[status] ?? "gray";
  return <span className={`adm-badge adm-badge-${tone}`}>{label ?? humanize(status)}</span>;
}

export function Avatar({ name, square = false }: { name: string; square?: boolean }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
  return (
    <span className={`adm-avatar${square ? " adm-avatar-square" : ""}`} aria-hidden="true">
      {initials || "?"}
    </span>
  );
}

export function IconAvatar({ icon: IconCmp, tint }: { icon: Icon; tint: Tint }) {
  return (
    <span className={`icon-badge icon-badge-${tint}`} aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }}>
      <IconCmp width={18} height={18} />
    </span>
  );
}

export function AdminEmpty({ icon: IconCmp, title, text }: { icon: Icon; title: string; text: string }) {
  return (
    <div className="adm-empty">
      <span className="icon-badge icon-badge-blue" aria-hidden="true" style={{ width: 46, height: 46, marginBottom: 6 }}>
        <IconCmp width={20} height={20} />
      </span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export function formatINR(value: number | string): string {
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
