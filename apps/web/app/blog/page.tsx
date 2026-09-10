import { MarketingHeader } from "../../components/MarketingHeader";
import { MarketingFooter } from "../../components/MarketingFooter";

export const metadata = { title: "Blog" };

export default function BlogPage() {
  return (
    <main>
      <MarketingHeader />
      <section className="container" style={{ padding: "64px 24px 96px", maxWidth: 720 }}>
        <span className="eyebrow" style={{ marginBottom: 16 }}>Blog</span>
        <h1 style={{ marginTop: 12 }}>Notes on running creator campaigns.</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 16, marginBottom: 40 }}>
          Playbooks, product updates, and what we're learning from campaigns running on Vidlix.
        </p>
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <h3 style={{ fontSize: 17, marginBottom: 6 }}>First posts are on the way</h3>
          <p className="helper-text" style={{ margin: 0 }}>Check back soon, or follow us on social for updates in the meantime.</p>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
