"use client";

import type { ReactNode, SVGProps } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./Button";

interface ActionSpec {
  label: string;
  href: string;
  icon?: (props: SVGProps<SVGSVGElement>) => JSX.Element;
}

interface EmptyStateProps {
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  tint: "purple" | "blue" | "green" | "pink" | "amber";
  heading: string;
  description: string;
  primary?: ActionSpec;
  secondary?: ActionSpec;
  children?: ReactNode;
}

/** A friendlier "nothing here yet" state — a tinted icon instead of a
 * bare line of text, a real heading/description, and up to two real
 * actions (using the real <Button> component, not a look-alike, so
 * hover/press/focus states match every other button in the app).
 * `children` is for a page's own footer content underneath (a
 * 3-column feature strip, an FAQ, a "how it works" list) — kept
 * generic here rather than baking every page's specific footer in. */
export function EmptyState({ icon: Icon, tint, heading, description, primary, secondary, children }: EmptyStateProps) {
  const router = useRouter();

  return (
    <div className="card" style={{ textAlign: "center", padding: "56px 32px" }}>
      <span
        className={`icon-badge icon-badge-lg icon-badge-${tint}`}
        aria-hidden="true"
        style={{ margin: "0 auto 20px" }}
      >
        <Icon width={28} height={28} />
      </span>
      <h3 style={{ marginBottom: 8 }}>{heading}</h3>
      <p className="helper-text" style={{ maxWidth: 420, margin: "0 auto 24px", fontSize: 14 }}>
        {description}
      </p>
      {(primary || secondary) && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: children ? 32 : 0 }}>
          {primary && (
            <Button onClick={() => router.push(primary.href)}>
              {primary.icon && <primary.icon width={16} height={16} />}
              {primary.label}
            </Button>
          )}
          {secondary && (
            <Button variant="secondary" onClick={() => router.push(secondary.href)}>
              {secondary.icon && <secondary.icon width={16} height={16} />}
              {secondary.label}
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
