// =============================================================================
// CalorieRing.tsx — a circular progress ring for calories.
//
// The ring fills up as you log food. The center shows how many calories you
// have REMAINING for the day. Going over budget is shown calmly (no red, no
// shaming) — just "over by N".
// =============================================================================

export default function CalorieRing({
  consumed,
  target,
}: {
  consumed: number;
  target: number;
}) {
  const remaining = Math.round(target - consumed);
  const over = remaining < 0;

  // Fraction of the target eaten (0..1), visually capped at 1 so the ring
  // doesn't overshoot. We still report the true remaining number in the middle.
  const fraction = target > 0 ? Math.min(consumed / target, 1) : 0;

  // SVG ring geometry.
  const size = 180;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - fraction);

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track (the faint full circle behind the progress). */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-black/10 dark:text-white/10"
        />
        {/* Progress arc. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 350ms ease" }}
        />
      </svg>

      {/* Center text overlay. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums">
          {Math.abs(remaining)}
        </span>
        <span className="text-xs text-muted">
          {over ? "over budget" : "kcal left"}
        </span>
        <span className="mt-1 text-xs text-muted tabular-nums">
          {Math.round(consumed)} / {Math.round(target)}
        </span>
      </div>
    </div>
  );
}
