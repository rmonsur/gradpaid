import type { ReactNode } from 'react';

export interface FieldProps {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly children: ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps): React.ReactElement {
  return (
    <label className="block">
      <span className="label mb-2 block">{label}</span>
      {children}
      {error ? <span className="mt-2 block text-xs text-danger">{error}</span> : null}
      {!error && hint ? <span className="mt-2 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
