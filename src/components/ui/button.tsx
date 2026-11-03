import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-background hover:bg-accent-strong disabled:bg-border disabled:text-muted',
  secondary:
    'border border-border bg-transparent text-foreground hover:border-border-strong hover:bg-surface-raised',
  ghost: 'text-accent hover:bg-accent-soft',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
}

/** Control: 15px radius, mono 14px, 600 weight; one primary per viewport. */
export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: ButtonProps): React.ReactElement {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] px-5 py-3 font-mono text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${className}`}
    />
  );
}
