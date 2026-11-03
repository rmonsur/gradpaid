/** All money is handled as integer cents to avoid floating point drift. */

export const CENTS_PER_DOLLAR = 100;
export const DEFAULT_CURRENCY = 'USD';

export function toCents(amount: number): number {
  return Math.round(amount * CENTS_PER_DOLLAR);
}

export function fromCents(cents: number): number {
  return cents / CENTS_PER_DOLLAR;
}

/** Formats cents as a PayPal amount string with exactly two decimals, e.g. 1250 -> "12.50". */
export function toPayPalAmount(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error(`Invalid cents value: ${cents}`);
  }
  return (cents / CENTS_PER_DOLLAR).toFixed(2);
}

export function parsePayPalAmount(value: string): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid PayPal amount: ${value}`);
  }
  return toCents(parsed);
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: DEFAULT_CURRENCY }).format(
    fromCents(cents),
  );
}
