'use client';

import { useEffect, useRef, useState } from 'react';
import { formatUsd } from '@/lib/money';

const FLASH_MS = 900;

export interface AccountTileProps {
  readonly name: string;
  readonly account: string;
  readonly cents: number;
  readonly caption: string;
  readonly emphasis?: boolean;
  readonly muted?: boolean;
}

/** One PayPal account on the board; the value flashes lime whenever it changes. */
export function AccountTile({
  name,
  account,
  cents,
  caption,
  emphasis = false,
  muted = false,
}: AccountTileProps): React.ReactElement {
  const previous = useRef(cents);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (previous.current === cents) {
      return undefined;
    }
    previous.current = cents;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), FLASH_MS);
    return (): void => clearTimeout(timer);
  }, [cents]);
  return (
    <div
      className={`flex flex-col gap-2 rounded-[var(--radius-card)] border p-5 transition-colors duration-200 ${
        flash
          ? 'border-accent bg-accent-soft'
          : emphasis
            ? 'border-accent/40 bg-surface'
            : 'border-border bg-surface'
      } ${muted ? 'opacity-70' : ''}`}
    >
      <div className="label">{account}</div>
      <div className="text-sm text-foreground">{name}</div>
      <div
        className={`display text-3xl normal-case tracking-tight ${emphasis || flash ? 'text-accent' : 'text-foreground'}`}
        aria-live="polite"
      >
        {formatUsd(cents)}
      </div>
      <div className="text-xs text-muted">{caption}</div>
    </div>
  );
}
