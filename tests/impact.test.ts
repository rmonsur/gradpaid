import { describe, it, expect } from 'vitest';
import { prepaymentImpact } from '@/features/campaigns/impact';

/** Seeded nursing loan: $18,400.00 at 5.50% APR, $215.00 a month. */
const LOAN = { balanceCents: 1_840_000, interestRateBps: 550, monthlyPaymentCents: 21_500 };

describe('prepaymentImpact', () => {
  it('a $60 gift saves about $38.85 of interest and 14 days (closed-form reference)', () => {
    const impact = prepaymentImpact(LOAN, 6_000);
    expect(Math.abs(impact.interestSavedCents - 3_885)).toBeLessThanOrEqual(150);
    expect(Math.abs(impact.daysSooner - 14)).toBeLessThanOrEqual(1);
  });

  it('a $100 gift saves about $64.63 of interest and 23 days', () => {
    const impact = prepaymentImpact(LOAN, 10_000);
    expect(Math.abs(impact.interestSavedCents - 6_463)).toBeLessThanOrEqual(150);
    expect(Math.abs(impact.daysSooner - 23)).toBeLessThanOrEqual(1);
  });

  it('a zero gift changes nothing', () => {
    expect(prepaymentImpact(LOAN, 0)).toEqual({ interestSavedCents: 0, daysSooner: 0 });
  });

  it('a payment that never covers interest reports no impact instead of looping forever', () => {
    const impact = prepaymentImpact({ ...LOAN, monthlyPaymentCents: 5_000 }, 6_000);
    expect(impact).toEqual({ interestSavedCents: 0, daysSooner: 0 });
  });
});
