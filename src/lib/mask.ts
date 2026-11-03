const LOAN_REF_VISIBLE_DIGITS = 4;

/** Shows only the last four characters of a loan account reference. */
export function maskLoanRef(ref: string): string {
  return `****${ref.slice(-LOAN_REF_VISIBLE_DIGITS)}`;
}
