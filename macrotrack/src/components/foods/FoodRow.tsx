// =============================================================================
// FoodRow.tsx — one tappable row in a food list (search results, recents, my
// foods, recipe items). Shows a title, an optional subtitle, calories, and any
// extra action buttons (like a star or delete) on the right.
// =============================================================================

export default function FoodRow({
  title,
  subtitle,
  calories,
  onClick,
  actions,
}: {
  title: string;
  subtitle?: string;
  calories?: number;
  onClick?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2 rounded-2xl border border-black/10 dark:border-white/10 bg-card">
      <button
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{title}</div>
          {subtitle && (
            <div className="truncate text-xs text-muted">{subtitle}</div>
          )}
        </div>
        {calories !== undefined && (
          <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
            {Math.round(calories)}
            <span className="ml-0.5 text-xs font-normal text-muted">kcal</span>
          </div>
        )}
      </button>
      {actions && <div className="flex items-center gap-1 pr-2">{actions}</div>}
    </li>
  );
}
