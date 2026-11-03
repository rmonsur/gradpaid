import { describe, it, expect } from 'vitest';
import { signLoanFacts, verifyLoanFacts } from '@/lib/intake-token';

const facts = {
  servicerName: 'MOHELA',
  loanAccountRef: '4471029938',
  balanceCents: 1_840_000,
  interestRateBps: 550,
  monthlyPaymentCents: 21_500,
};

describe('intake token', () => {
  it('verifies the exact facts it signed', () => {
    const token = signLoanFacts(facts);
    expect(token).toHaveLength(64);
    expect(verifyLoanFacts(facts, token)).toBe(true);
  });
  it('rejects any changed field or malformed token', () => {
    const token = signLoanFacts(facts);
    expect(verifyLoanFacts({ ...facts, balanceCents: 1 }, token)).toBe(false);
    expect(verifyLoanFacts({ ...facts, loanAccountRef: '1' }, token)).toBe(false);
    expect(verifyLoanFacts(facts, 'zz')).toBe(false);
  });
});
