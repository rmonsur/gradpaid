import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'border-border text-muted',
  accent: 'border-accent/40 text-accent',
  success: 'border-accent/40 text-accent',
  warning: 'border-warning/50 text-warning',
  danger: 'border-danger/50 text-danger',
};

export interface BadgeProps {
  readonly tone?: BadgeTone;
  readonly live?: boolean;
  readonly children: ReactNode;
}

/** Pill badge: 9999px radius, hairline border, mono label type. */
export function Badge({
  tone = 'neutral',
  live = false,
  children,
}: BadgeProps): React.ReactElement {
  return (
    <span
      className={`label inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${BADGE_TONES[tone]}`}
    >
      {live ? (
        <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
      ) : null}
      {children}
    </span>
  );
}
