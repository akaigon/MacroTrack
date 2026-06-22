// =============================================================================
// PageHeader.tsx — a simple title (and optional subtitle) shown at the top of
// each tab's page. Keeping it in one place makes every page look consistent.
// =============================================================================

export default function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </header>
  );
}
