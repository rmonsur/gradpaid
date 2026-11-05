export interface LoanTerms {
  readonly balanceCents: number;
  readonly interestRateBps: number;
  readonly monthlyPaymentCents: number;
}

export interface PrepaymentImpact {
  readonly interestSavedCents: number;
  readonly daysSooner: number;
}

const BPS_PER_UNIT = 10_000;
const MONTHS_PER_YEAR = 12;
const DAYS_PER_MONTH = 365.25 / MONTHS_PER_YEAR;
/** Fifty years of monthly payments; beyond this the loan is treated as never paid off. */
const MAX_MONTHS = 600;
const NO_IMPACT: PrepaymentImpact = { interestSavedCents: 0, daysSooner: 0 };

interface Payoff {
  readonly months: number;
  readonly interestCents: number;
}

/** Month-by-month amortisation; the last month pays only what is left. */
function payoff(terms: LoanTerms): Payoff | undefined {
  const rate = terms.interestRateBps / BPS_PER_UNIT / MONTHS_PER_YEAR;
  let balance = terms.balanceCents;
  let interestCents = 0;
  let months = 0;
  while (balance > 0) {
    if (months >= MAX_MONTHS) {
      return undefined;
    }
    const interest = balance * rate;
    const owed = balance + interest;
    const paid = Math.min(terms.monthlyPaymentCents, owed);
    interestCents += interest;
    months += paid < terms.monthlyPaymentCents ? paid / terms.monthlyPaymentCents : 1;
    balance = owed - paid;
  }
  return { months, interestCents };
}

/**
 * What a one-off principal payment does to a loan paid at its usual monthly amount: interest
 * no longer owed and how many days sooner it is paid off. Used for the impact line donors see.
 */
export function prepaymentImpact(terms: LoanTerms, giftCents: number): PrepaymentImpact {
  if (giftCents <= 0) {
    return NO_IMPACT;
  }
  const before = payoff(terms);
  const after = payoff({ ...terms, balanceCents: Math.max(0, terms.balanceCents - giftCents) });
  if (!before || !after) {
    return NO_IMPACT;
  }
  return {
    interestSavedCents: Math.max(0, Math.round(before.interestCents - after.interestCents)),
    daysSooner: Math.max(0, Math.round((before.months - after.months) * DAYS_PER_MONTH)),
  };
}
