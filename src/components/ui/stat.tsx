export interface StatProps {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly accent?: boolean;
}

/** Stat tile: label-md eyebrow, display-sm value, optional hint. */
export function Stat({ label, value, hint, accent = false }: StatProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <div className="label">{label}</div>
      <div
        className={`display text-2xl normal-case tracking-tight ${accent ? 'text-accent' : 'text-foreground'}`}
      >
        {value}
      </div>
      {hint ? <div className="text-xs text-muted">{hint}</div> : null}
    </div>
  );
}
