import type { ReactNode } from 'react';

export interface PageHeaderProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly children?: ReactNode;
}

/** Page title block: mono eyebrow, Inter display title, mono subhead. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  children,
}: PageHeaderProps): React.ReactElement {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-2xl space-y-3">
        {eyebrow ? <div className="label">{eyebrow}</div> : null}
        <h1 className="display text-4xl md:text-5xl">{title}</h1>
        {subtitle ? <p className="text-muted">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
