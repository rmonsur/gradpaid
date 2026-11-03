import { describe, it, expect } from 'vitest';
import { toCents, toPayPalAmount, parsePayPalAmount, formatUsd } from '@/lib/money';

describe('money', () => {
  it('round-trips cents through PayPal amount strings', () => {
    expect(toPayPalAmount(1250)).toBe('12.50');
    expect(toPayPalAmount(5)).toBe('0.05');
    expect(parsePayPalAmount('12.50')).toBe(1250);
  });
  it('rejects negative or fractional cents', () => {
    expect(() => toPayPalAmount(-1)).toThrow();
    expect(() => toPayPalAmount(1.5)).toThrow();
  });
  it('converts dollars without float drift', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
  });
  it('formats USD', () => {
    expect(formatUsd(123456)).toBe('$1,234.56');
  });
});
