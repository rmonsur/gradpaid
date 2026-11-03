import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Route } from 'next';

export type LinkButtonVariant = 'primary' | 'secondary';

const LINK_VARIANTS: Record<LinkButtonVariant, string> = {
  primary: 'bg-accent text-background hover:bg-accent-strong',
  secondary:
    'border border-border text-foreground hover:border-border-strong hover:bg-surface-raised',
};

export interface LinkButtonProps {
  readonly href: Route;
  readonly variant?: LinkButtonVariant;
  readonly children: ReactNode;
  readonly className?: string;
}

/** Anchor styled like Button, for navigation calls to action. */
export function LinkButton({
  href,
  variant = 'primary',
  children,
  className = '',
}: LinkButtonProps): React.ReactElement {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] px-5 py-3 font-mono text-sm font-semibold transition-colors duration-150 ${LINK_VARIANTS[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
