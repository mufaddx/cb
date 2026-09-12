/**
 * The one loading state every page should render while its data is
 * still in flight — replaces ~25 pages' own ad hoc `<p>Loading…</p>`
 * (unstyled, top-left, plain text, different per page) with a single
 * centered spinner so a page that's still loading looks the same and
 * looks intentional everywhere, not like unfinished markup.
 */
export function PageLoader() {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh" }}
    >
      <span className="spinner" />
    </div>
  );
}
