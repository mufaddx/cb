import type { ReactNode, SVGProps } from "react";

interface PageHeadingProps {
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  tint: "purple" | "blue" | "green" | "pink" | "amber";
  title: string;
  description: string;
  action?: ReactNode;
}

/** The icon + title + description row every Creator panel page opens
 * with (Instagram, Offers, My Deals, Messages, Wallet, Profile,
 * Settings) — pulled into one component instead of six near-identical
 * copies. `action` is whatever sits on the right (a "last synced"
 * timestamp + refresh button, a date badge, nothing). */
export function PageHeading({ icon: Icon, tint, title, description, action }: PageHeadingProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <span className={`icon-badge icon-badge-${tint}`} aria-hidden="true" style={{ marginTop: 2 }}>
          <Icon width={19} height={19} />
        </span>
        <div>
          <h1 style={{ margin: 0 }}>{title}</h1>
          <p className="helper-text" style={{ marginTop: 4, fontSize: 14 }}>
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}
