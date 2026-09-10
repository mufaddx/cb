import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";

// Self-hosted by Next at build time (no runtime request to Google) —
// exposed as a CSS variable so globals.css controls where it's used
// instead of hardcoding a className on every page.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Vidlix — Creator Campaign Marketplace",
    template: "%s — Vidlix",
  },
  description: "Turn your campaign into creator-powered reach. Clipping, creator content, and product review campaigns — matched, tracked, and paid out end to end.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
