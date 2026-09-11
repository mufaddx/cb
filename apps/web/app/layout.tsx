import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";

// Self-hosted by Next at build time (no runtime request to Google) —
// exposed as a CSS variable so globals.css controls where it's used
// instead of hardcoding a className on every page.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const SITE_URL = "https://vidlix.in";
const DESCRIPTION =
  "Turn your campaign into creator-powered reach. Clipping and creator content campaigns — matched, tracked, and paid out end to end.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Vidlix — Creator Campaign Marketplace",
    template: "%s — Vidlix",
  },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Vidlix",
    url: SITE_URL,
    title: "Vidlix — Creator Campaign Marketplace",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: "Vidlix — Creator Campaign Marketplace",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
