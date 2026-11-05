import Link from 'next/link';
import { formatUsd } from '@/lib/money';
import { formatWhen } from '@/lib/format';
import { Badge, Card } from '@/components/ui';
import type { LivePayload } from './types';

const KIND_LABELS: Record<LivePayload['movements'][number]['kind'], string> = {
  donation_captured: 'Donation captured',
  sponsor_invoiced: 'Sponsor invoiced',
  sponsor_paid: 'Sponsor paid',
  servicer_payout: 'Servicer payout',
  refund: 'Refund',
  reconciled: 'Reconciled',
  exception: 'Exception',
};

export function MovementFeed({
  movements,
}: {
  readonly movements: LivePayload['movements'];
}): React.ReactElement {
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="label text-foreground">Latest movements</h2>
      {movements.length === 0 ? (
        <p className="text-sm text-muted">
          No movements yet. Run the full story to watch money move.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {movements.map((m) => (
            <li key={m.id} className="rise flex flex-wrap items-center gap-3 py-2.5 text-sm">
              <Badge tone={m.kind === 'exception' ? 'danger' : 'accent'}>
                {KIND_LABELS[m.kind]}
              </Badge>
              <span className="text-foreground">{formatUsd(m.amountCents)}</span>
              <span className="text-muted">{m.counterparty}</span>
              {m.paypalRef ? (
                <Link
                  href={`/proof?ref=${m.paypalRef}`}
                  className="font-mono text-xs text-accent hover:underline"
                >
                  {m.paypalRef}
                </Link>
              ) : null}
              <span className="ml-auto text-xs text-muted">{formatWhen(m.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
