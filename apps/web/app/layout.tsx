import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Antigravity — Creator Campaign Marketplace",
  description: "Turn your campaign into creator-powered reach.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
