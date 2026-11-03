import { createHmac, timingSafeEqual } from 'node:crypto';
import { getEnv } from '@/lib/env';

/** The loan facts the intake agent read. Only these fields are covered by the signature. */
export interface SignedLoanFacts {
  readonly servicerName: string;
  readonly loanAccountRef: string;
  readonly balanceCents: number;
  readonly interestRateBps: number;
  readonly monthlyPaymentCents: number;
}

function canonical(facts: SignedLoanFacts): string {
  return JSON.stringify([
    facts.servicerName,
    facts.loanAccountRef,
    facts.balanceCents,
    facts.interestRateBps,
    facts.monthlyPaymentCents,
  ]);
}

/**
 * Signs the facts the intake agent extracted so the publish step cannot submit
 * different loan numbers than the statement showed. Verification only passes when
 * the submitted facts match the signed ones byte for byte.
 */
export function signLoanFacts(facts: SignedLoanFacts): string {
  return createHmac('sha256', getEnv().CRON_SECRET).update(canonical(facts)).digest('hex');
}

export function verifyLoanFacts(facts: SignedLoanFacts, token: string): boolean {
  const expected = Buffer.from(signLoanFacts(facts), 'hex');
  const given = Buffer.from(token, 'hex');
  return expected.length === given.length && timingSafeEqual(expected, given);
}
