import { AppShell } from "@/components/AppShell";
import { ConfirmProvider } from "@/lib/useConfirm";

// One persistent shell (fixed sidebar + mobile bottom nav) for every
// brand/creator page — dashboard, campaigns, deals, offers, products,
// shipments, wallet. Grouping them under (app) doesn't change their
// URLs (route group segments are stripped from the path), it just
// lets them share this layout instead of each page rendering its own
// header component.
//
// ConfirmProvider wraps here (not just admin/layout.tsx) because
// campaigns/[id]/page.tsx already calls useConfirm() for submit/
// cancel/content-review actions with no provider anywhere in this
// tree — a real latent bug (useConfirm throws "must be used inside
// <ConfirmProvider>") that only surfaced once instagram/page.tsx's
// new Disconnect confirmation made Next's static prerendering of
// /instagram execute the same missing-provider path at build time.
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmProvider>
      <AppShell>{children}</AppShell>
    </ConfirmProvider>
  );
}
