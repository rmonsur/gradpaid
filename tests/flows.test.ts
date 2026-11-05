import { describe, it, expect } from 'vitest';
import { summarizeFlows, type FlowEntry } from '@/features/live/flows';

const entries: readonly FlowEntry[] = [
  { kind: 'donation_captured', amountCents: 6_000 },
  { kind: 'donation_captured', amountCents: 4_000 },
  { kind: 'servicer_payout', amountCents: 6_000 },
  { kind: 'sponsor_invoiced', amountCents: 6_000 },
  { kind: 'reconciled', amountCents: 0 },
  { kind: 'exception', amountCents: 4_000 },
];

describe('summarizeFlows', () => {
  it('totals each account from ledger rows and keeps the borrower at zero', () => {
    expect(summarizeFlows(entries)).toEqual({
      donorsPaidCents: 10_000,
      platformHeldCents: 4_000,
      servicersReceivedCents: 6_000,
      sponsorInvoicedCents: 6_000,
      sponsorPaidCents: 0,
      borrowerReceivedCents: 0,
      exceptions: 1,
    });
  });

  it('is all zeros for an empty ledger', () => {
    expect(summarizeFlows([]).donorsPaidCents).toBe(0);
    expect(summarizeFlows([]).platformHeldCents).toBe(0);
  });
});
