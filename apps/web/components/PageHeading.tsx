import type { ReactNode, SVGProps } from "react";

interface PageHeadingProps {
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  tint: "purple" | "blue" | "green" | "pink" | "amber";
  title: string;
  description: string;
  action?: ReactNode;
}

/** Used to open every Creator/Brand panel page (Instagram, Offers, My
 * Deals, Messages, Wallet, Profile, Settings, ...). The page's identity
 * (icon/title/description) now comes from the unified header instead —
 * AppShell already shows the current page's nav label there, so
 * repeating it again at the top of the content area just duplicated
 * it. `title`/`description`/`icon`/`tint` stay in the props (so no
 * caller needs touching) but are intentionally unused here now;
 * `action` — the one thing each caller actually needed rendered
 * (Campaigns' "+ Create Campaign", Instagram's refresh control) —
 * still renders, right-aligned, so nothing on the right is lost. */
export function PageHeading({ action }: PageHeadingProps) {
  if (!action) return null;
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
      {action}
    </div>
  );
}
