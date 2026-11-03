import type { ReactNode } from 'react';

export interface CardProps {
  readonly children: ReactNode;
  readonly className?: string;
  /** Mono index shown top-left, e.g. "03/". */
  readonly index?: string;
  readonly as?: 'div' | 'section' | 'article';
}

/** Surface card: 15px radius, hairline border, 24px padding, no shadow. */
export function Card({
  children,
  className = '',
  index,
  as: Tag = 'div',
}: CardProps): React.ReactElement {
  const background = /\bbg-/.test(className) ? '' : 'bg-surface';
  return (
    <Tag
      className={`rounded-[var(--radius-card)] border border-border ${background} p-6 transition-colors duration-150 hover:border-border-strong ${className}`}
    >
      {index ? <div className="label mb-4">{index}</div> : null}
      {children}
    </Tag>
  );
}
