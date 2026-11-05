import type { LedgerEntry } from '@/db/schema';

export type FlowEntry = Pick<LedgerEntry, 'kind' | 'amountCents'>;

/** Money per party, derived only from ledger rows. The borrower has no row kind, so stays 0. */
export interface FlowSummary {
  readonly donorsPaidCents: number;
  readonly platformHeldCents: number;
  readonly servicersReceivedCents: number;
  readonly sponsorInvoicedCents: number;
  readonly sponsorPaidCents: number;
  readonly borrowerReceivedCents: number;
  readonly exceptions: number;
}

function sumKind(entries: readonly FlowEntry[], kind: FlowEntry['kind']): number {
  return entries.reduce((total, e) => total + (e.kind === kind ? e.amountCents : 0), 0);
}

export function summarizeFlows(entries: readonly FlowEntry[]): FlowSummary {
  const donorsPaidCents = sumKind(entries, 'donation_captured');
  const servicersReceivedCents = sumKind(entries, 'servicer_payout');
  return {
    donorsPaidCents,
    platformHeldCents: donorsPaidCents - servicersReceivedCents - sumKind(entries, 'refund'),
    servicersReceivedCents,
    sponsorInvoicedCents: sumKind(entries, 'sponsor_invoiced'),
    sponsorPaidCents: sumKind(entries, 'sponsor_paid'),
    borrowerReceivedCents: 0,
    exceptions: entries.filter((e) => e.kind === 'exception').length,
  };
}
