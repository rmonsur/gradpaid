const STEP_LABELS = ['Upload', 'Review', 'Publish'] as const;

export type WizardStep = 1 | 2 | 3;

export function Stepper({ step }: { readonly step: WizardStep }): React.ReactElement {
  return (
    <ol className="mb-8 flex items-center gap-3 font-mono text-sm">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`label flex h-7 w-7 items-center justify-center rounded-full border ${
                active
                  ? 'border-accent bg-accent text-background'
                  : done
                    ? 'border-accent/40 text-accent'
                    : 'border-border text-muted'
              }`}
            >
              {n}
            </span>
            <span className={active ? 'text-foreground' : 'text-muted'}>{label}</span>
            {n < STEP_LABELS.length ? (
              <span className="mx-1 h-px w-8 bg-border" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
