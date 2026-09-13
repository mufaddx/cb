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

export function BellIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 10.5a6 6 0 0 1 12 0v4l1.5 3h-15l1.5-3Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5h16v10.5H9.5L5 20v-4H4Z" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function UploadCloudIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7.5 17.5a4.5 4.5 0 0 1-1-8.9 5.5 5.5 0 0 1 10.7-1.9A4.25 4.25 0 0 1 17 17.5" />
      <path d="M12 12v7" />
      <path d="M9 15l3-3 3 3" />
    </svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.3 11 14.8l4.5-5.6" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 7h15" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6.5 7l.7 12a1 1 0 0 0 1 .95h7.6a1 1 0 0 0 1-.95L17.5 7" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
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

export function MoreIcon(props: IconProps) {
  return (
    <svg {...base} {...props} fill="currentColor" stroke="none">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
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

export function MailIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4.5 7 12 12.5 19.5 7" />
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3.5h2.2l1.1 4-1.9 1.6a11.5 11.5 0 0 0 5.5 5.5l1.6-1.9 4 1.1V16a2 2 0 0 1-2.1 2A16.5 16.5 0 0 1 5 5.6 2 2 0 0 1 7 3.5Z" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 4.5v15l13-7.5Z" />
    </svg>
  );
}

export function XCircleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 20s-7.5-4.6-9.8-9.2C.7 7.3 2.3 4 5.7 3.4 8 3 10.2 4 12 6.5 13.8 4 16 3 18.3 3.4c3.4.6 5 3.9 3.5 7.4C19.5 15.4 12 20 12 20Z" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 8a8 8 0 0 0-14.6-3.5M4 4v4.5h4.5" />
      <path d="M4 16a8 8 0 0 0 14.6 3.5M20 20v-4.5h-4.5" />
    </svg>
  );
}

export function TrendingUpIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m3.5 16 6-6.5 4 4L20.5 6" />
      <path d="M15 6h5.5v5.5" />
    </svg>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h13M21 18h-1" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="19" cy="18" r="2" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3.5M16 3v3.5" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.6-4.6" />
    </svg>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19.5a2 2 0 1 1-4 0v-.08a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H4.5a2 2 0 1 1 0-4h.08a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10.5a1.7 1.7 0 0 0 1.04-1.56V4.5a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10.5a1.7 1.7 0 0 0 1.56 1.04h.08a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.56 1.04Z" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 5 6v6c0 4.5 3 7.5 7 8.5 4-1 7-4 7-8.5V6l-7-2.5Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function PaletteIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1 0 1.6-.7 1.6-1.5 0-.4-.15-.7-.4-1-.25-.3-.4-.6-.4-1 0-.8.65-1.5 1.5-1.5H16a4 4 0 0 0 4-4c0-4.4-3.6-8-8-8Z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10.5" cy="7.5" r="1" />
      <circle cx="15" cy="7.8" r="1" />
      <circle cx="17.2" cy="11.5" r="1" />
    </svg>
  );
}

export function LifeBuoyIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="m6 6 3.5 3.5M18 6l-3.5 3.5M6 18l3.5-3.5M18 18l-3.5-3.5" />
    </svg>
  );
}

export function FileTextIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M14 3.5V8h4.5" />
      <path d="M9 12.5h6M9 15.5h6M9 9.5h2" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20.5 3.5 3 10.5l6.5 2.7L15 20l5.5-16.5Z" />
      <path d="M9.5 13.2 20.5 3.5" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4.5 18.5v1a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1" />
    </svg>
  );
}

export function GiftIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="9.5" width="16" height="10.5" rx="1.5" />
      <path d="M4 9.5h16v3.5H4z" />
      <path d="M12 9.5v10.5" />
      <path d="M12 9.5c0-2.5-1.5-4-3.2-4A2.3 2.3 0 0 0 6.5 7.8c0 1 1 1.7 2.3 1.7H12Z" />
      <path d="M12 9.5c0-2.5 1.5-4 3.2-4a2.3 2.3 0 0 1 2.3 2.3c0 1-1 1.7-2.3 1.7H12Z" />
    </svg>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 6.5 12.3 5.2a3.3 3.3 0 0 1 4.7 4.7L15.5 11.4" />
      <path d="M13 17.5 11.7 18.8a3.3 3.3 0 0 1-4.7-4.7L8.5 12.6" />
    </svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 3.5l17 17" />
      <path d="M10.6 5.7A10.7 10.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15.5 15.5 0 0 1-3.2 4.1M7.3 7.3C4.7 8.9 2.5 12 2.5 12S6 18.5 12 18.5a9.9 9.9 0 0 0 3.5-.65" />
      <path d="M9.9 10a2.6 2.6 0 0 0 3.65 3.4" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h16" />
      <path d="m14 6 6 6-6 6" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M15.5 19.5v-1.6a3.6 3.6 0 0 0-3.6-3.6H6.1a3.6 3.6 0 0 0-3.6 3.6v1.6" />
      <circle cx="9" cy="8" r="3.4" />
      <path d="M21.5 19.5v-1.6a3.6 3.6 0 0 0-2.7-3.48M15.8 4.7a3.6 3.6 0 0 1 0 6.6" />
    </svg>
  );
}

export function ScissorsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="6.5" cy="17.5" r="2.8" />
      <circle cx="6.5" cy="6.5" r="2.8" />
      <path d="M20 5 8.6 15.7M14.5 13.7 20 19M8.6 8.3l3.1 2.9" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M16.4 3.9a2.1 2.1 0 0 1 3 3L8 18.3l-4 1 1-4Z" />
      <path d="m14.5 5.8 3.7 3.7" />
    </svg>
  );
}

export function BarChartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 20v-6.5M12 20V5M19 20v-9.5" />
    </svg>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M13.5 2.5 4 13.8h6.4L10 21.5 20 10.2h-6.5Z" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7v5.2l3.2 2" />
    </svg>
  );
}
