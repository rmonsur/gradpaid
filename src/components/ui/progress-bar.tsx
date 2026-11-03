const PERCENT_MAX = 100;

export interface ProgressBarProps {
  readonly value: number;
  readonly max: number;
}

/** Hairline progress track with a lime fill. */
export function ProgressBar({ value, max }: ProgressBarProps): React.ReactElement {
  const pct = max > 0 ? Math.min(PERCENT_MAX, Math.round((value / max) * PERCENT_MAX)) : 0;
  return (
    <div
      className="h-1 w-full overflow-hidden rounded-full bg-border"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={PERCENT_MAX}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-200"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
