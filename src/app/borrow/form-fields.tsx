'use client';

import type {
  ReactNode,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
} from 'react';

const FIELD_CLASS =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:opacity-60';

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}): React.ReactElement {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : null}
      {!error && hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>): React.ReactElement {
  return <input {...props} className={`${FIELD_CLASS} ${props.className ?? ''}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>): React.ReactElement {
  return <textarea {...props} className={`${FIELD_CLASS} min-h-24 ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>): React.ReactElement {
  return <select {...props} className={`${FIELD_CLASS} ${props.className ?? ''}`} />;
}

export function ErrorBanner({ message }: { message: string }): React.ReactElement {
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
    >
      {message}
    </div>
  );
}

export function Stepper({ step }: { step: 1 | 2 | 3 }): React.ReactElement {
  const steps = ['Upload', 'Review', 'Publish'] as const;
  return (
    <ol className="mb-6 flex items-center gap-3 text-sm">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                active
                  ? 'bg-accent-strong text-white'
                  : done
                    ? 'bg-success-soft text-success'
                    : 'bg-border/70 text-muted'
              }`}
            >
              {n}
            </span>
            <span className={active ? 'font-medium' : 'text-muted'}>{label}</span>
            {n < steps.length ? <span className="mx-1 h-px w-8 bg-border" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}
