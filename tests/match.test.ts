import { describe, it, expect } from 'vitest';
import { computeMatch } from '@/features/matching/match';

const rule = (over: Partial<Parameters<typeof computeMatch>[2][number]> = {}) => ({
  sponsorId: 's1',
  cohortTag: 'nursing',
  ratioBps: 10_000,
  capCents: 100_000,
  matchedCents: 0,
  ...over,
});

describe('computeMatch', () => {
  it('matches 1:1 for a matching cohort tag', () => {
    expect(computeMatch(5_000, ['nursing', 'ohio'], [rule()])).toEqual([
      { sponsorId: 's1', matchCents: 5_000 },
    ]);
  });

  it('ignores sponsors whose cohort does not match', () => {
    expect(computeMatch(5_000, ['teaching'], [rule()])).toEqual([]);
  });

  it('applies a fractional ratio and floors cents', () => {
    expect(computeMatch(333, ['nursing'], [rule({ ratioBps: 5_000 })])).toEqual([
      { sponsorId: 's1', matchCents: 166 },
    ]);
  });

  it('respects the remaining cap and drops exhausted sponsors', () => {
    expect(computeMatch(5_000, ['nursing'], [rule({ matchedCents: 98_000 })])).toEqual([
      { sponsorId: 's1', matchCents: 2_000 },
    ]);
    expect(computeMatch(5_000, ['nursing'], [rule({ matchedCents: 100_000 })])).toEqual([]);
  });
});
