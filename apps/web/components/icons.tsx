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

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
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

// Social icons are filled glyphs (brand marks, not stroke drawings) —
// same 20x20/currentColor contract as the rest of the set, just a
// different `base`.
const filledBase = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "currentColor" };

export function InstagramIcon(props: IconProps) {
  return (
    <svg {...filledBase} {...props}>
      <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.06 2.01.25 2.72.53a5.5 5.5 0 0 1 1.98 1.29 5.5 5.5 0 0 1 1.3 1.98c.27.71.46 1.55.52 2.72.06 1.24.07 1.65.07 4.85s0 3.6-.07 4.85c-.06 1.17-.25 2.01-.53 2.72a5.5 5.5 0 0 1-1.29 1.98 5.5 5.5 0 0 1-1.98 1.3c-.71.27-1.55.46-2.72.52-1.24.06-1.65.07-4.85.07s-3.6 0-4.85-.07c-1.17-.06-2.01-.25-2.72-.53a5.5 5.5 0 0 1-1.98-1.29 5.5 5.5 0 0 1-1.3-1.98c-.27-.71-.46-1.55-.52-2.72C2.21 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.06-1.17.25-2.01.53-2.72a5.5 5.5 0 0 1 1.29-1.98 5.5 5.5 0 0 1 1.98-1.3c.71-.27 1.55-.46 2.72-.52C8.4 2.21 8.8 2.2 12 2.2Zm0 1.98c-3.14 0-3.52 0-4.76.07-.96.04-1.48.2-1.82.34-.46.18-.79.39-1.13.73-.34.34-.55.67-.73 1.13-.13.34-.3.86-.34 1.82-.06 1.24-.07 1.62-.07 4.76s0 3.52.07 4.76c.04.96.2 1.48.34 1.82.18.46.39.79.73 1.13.34.34.67.55 1.13.73.34.13.86.3 1.82.34 1.24.06 1.62.07 4.76.07s3.52 0 4.76-.07c.96-.04 1.48-.2 1.82-.34.46-.18.79-.39 1.13-.73.34-.34.55-.67.73-1.13.13-.34.3-.86.34-1.82.06-1.24.07-1.62.07-4.76s0-3.52-.07-4.76c-.04-.96-.2-1.48-.34-1.82a3.06 3.06 0 0 0-.73-1.13 3.06 3.06 0 0 0-1.13-.73c-.34-.13-.86-.3-1.82-.34-1.24-.06-1.62-.07-4.76-.07Zm0 3.37a4.45 4.45 0 1 1 0 8.9 4.45 4.45 0 0 1 0-8.9Zm0 1.98a2.47 2.47 0 1 0 0 4.94 2.47 2.47 0 0 0 0-4.94Zm4.63-3.6a1.04 1.04 0 1 1 0 2.08 1.04 1.04 0 0 1 0-2.08Z" />
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <svg {...filledBase} {...props}>
      <path d="M13.5 21.9v-8.2h2.75l.41-3.2h-3.16V8.45c0-.93.26-1.56 1.59-1.56h1.7V3.99A22.9 22.9 0 0 0 14.3 3.8c-2.44 0-4.11 1.49-4.11 4.22V10.5H7.43v3.2h2.76v8.2Z" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...filledBase} {...props}>
      <path d="M13.6 10.7 20.1 3.2h-1.9l-5.6 6.5-4.5-6.5H2.5l6.8 9.9-6.8 7.9h1.9l5.9-6.9 4.8 6.9h5.6Zm-2.1 2.4-.7-1L5.3 4.6h2.1l4.4 6.3.7 1 5.7 8.2h-2.1Z" />
    </svg>
  );
}

export function YoutubeIcon(props: IconProps) {
  return (
    <svg {...filledBase} {...props}>
      <path d="M21.6 7.2a2.75 2.75 0 0 0-1.94-1.95C18.03 4.8 12 4.8 12 4.8s-6.03 0-7.66.45A2.75 2.75 0 0 0 2.4 7.2 28.8 28.8 0 0 0 1.95 12a28.8 28.8 0 0 0 .45 4.8 2.75 2.75 0 0 0 1.94 1.95C5.97 19.2 12 19.2 12 19.2s6.03 0 7.66-.45a2.75 2.75 0 0 0 1.94-1.95c.3-1.58.45-3.19.45-4.8a28.8 28.8 0 0 0-.45-4.8ZM9.95 15.3V8.7l5.7 3.3Z" />
    </svg>
  );
}
