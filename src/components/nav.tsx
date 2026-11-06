import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';
import { Badge } from '@/components/ui';

const LINKS = [
  { href: '/give', label: 'Give' },
  { href: '/borrow', label: 'Borrowers' },
  { href: '/live', label: 'Live' },
  { href: '/ledger', label: 'Ledger' },
  { href: '/proof', label: 'Proof' },
  { href: '/why', label: 'Why it pays' },
  { href: '/demo', label: 'Agent console' },
] as const;

export function Nav(): React.ReactElement {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="display flex items-center gap-3 text-base">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-1 font-mono text-sm" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-[var(--radius-control)] px-3 py-2 text-muted transition-colors duration-150 hover:bg-surface-raised hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <span className="ml-3 hidden md:inline-flex">
            <Badge tone="accent">Sandbox</Badge>
          </span>
        </nav>
      </div>
    </header>
  );
}
