import type { ReactNode, SVGProps } from "react";
import Link from "next/link";

type Tint = "purple" | "blue" | "green" | "pink" | "amber";

interface StatCardProps {
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  tint: Tint;
  label: string;
  value: ReactNode;
  trend?: ReactNode;
  href?: string;
}

/** One dashboard/overview stat tile: tinted icon badge, label (with an
 * optional link out to the full view), a big value, and a small trend
 * line underneath. Used anywhere a page shows "N of something" as its
 * own tile rather than in a table. */
export function StatCard({ icon: Icon, tint, label, value, trend, href }: StatCardProps) {
  return (
    <div className="card" style={{ flex: "1 1 220px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className={`icon-badge icon-badge-${tint}`} aria-hidden="true">
            <Icon width={19} height={19} />
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text-secondary)" }}>{label}</span>
        </div>
        {href && (
          <Link href={href} aria-label={`View ${label}`} style={{ color: "var(--color-text-faint)", display: "flex" }}>
            →
          </Link>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 750, letterSpacing: "-0.01em" }}>{value}</div>
      {trend && <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", marginTop: 6 }}>{trend}</div>}
    </div>
  );
}
