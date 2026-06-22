// =============================================================================
// MacroBar.tsx — a horizontal progress bar for one macro (protein/carbs/fat).
//
// Shows the label, "consumed / target g", and a colored fill. The fill is
// visually capped at 100% so it never spills outside the track, but the text
// always shows the real numbers.
// =============================================================================

export default function MacroBar({
  label,
  consumed,
  target,
  colorClass,
}: {
  label: string;
  consumed: number;
  target: number;
  colorClass: string; // a Tailwind background color, e.g. "bg-sky-500"
}) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted tabular-nums">
          {Math.round(consumed)} / {Math.round(target)} g
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${pct}%`, transition: "width 350ms ease" }}
        />
      </div>
    </div>
  );
}
