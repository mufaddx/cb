// Minimal inline icon set (stroke-based, 20x20, currentColor) — no
// external icon library dependency for a handful of nav glyphs.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9.5a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function MegaphoneIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10v4a1 1 0 0 0 1 1h2l1.5 5H10l-1-5h1l10 4V6L10 10H4a1 1 0 0 0-1 1Z" />
      <path d="M18 9v8" />
    </svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

export function HandshakeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 12 3 7l3-3 5 3" />
      <path d="M16 12l5-5-3-3-5 3" />
      <path d="M8 12l2.5 2.5a1.7 1.7 0 0 0 2.4 0 1.7 1.7 0 0 0 0-2.4L10.5 9.5" />
      <path d="M13 12.5l1.5 1.5a1.7 1.7 0 0 0 2.4 0 1.7 1.7 0 0 0 0-2.4" />
      <path d="M3 7l2 8 3.5 3.5" />
      <path d="M21 7l-2 8-2.5 2.5" />
    </svg>
  );
}

export function PackageIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </svg>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M16 14.5h2" />
    </svg>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M15 16l4-4-4-4" />
      <path d="M19 12H9" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2 9.8 8.6 3 11l6.8 2.4L12 20l2.2-6.6L21 11l-6.8-2.4Z" />
    </svg>
  );
}
