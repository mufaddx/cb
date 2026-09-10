import { AppShell } from "@/components/AppShell";

// One persistent shell (fixed sidebar + mobile bottom nav) for every
// brand/creator page — dashboard, campaigns, deals, offers, products,
// shipments, wallet. Grouping them under (app) doesn't change their
// URLs (route group segments are stripped from the path), it just
// lets them share this layout instead of each page rendering its own
// header component.
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
