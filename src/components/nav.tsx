import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';

const LINKS = [
  { href: '/give', label: 'Give' },
  { href: '/borrow', label: 'Borrowers' },
  { href: '/ledger', label: 'Ledger' },
  { href: '/demo', label: 'Agent console' },
] as const;

export function Nav(): React.ReactElement {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block h-6 w-6 rounded-md bg-accent-strong" aria-hidden />
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-muted transition hover:bg-accent-soft hover:text-accent-strong"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
