import { describe, it, expect } from 'vitest';
import { splitDonation } from '@/features/campaigns/split';

const c = (id: string, remainingCents: number) => ({ campaignId: id, remainingCents, reason: 'r' });

describe('splitDonation', () => {
  it('splits evenly and assigns remainder cents to the first lines', () => {
    const lines = splitDonation(10_000, [c('a', 1e6), c('b', 1e6), c('c', 1e6)]);
    expect(lines.map((l) => l.cents)).toEqual([3334, 3333, 3333]);
    expect(lines.reduce((s, l) => s + l.cents, 0)).toBe(10_000);
  });

  it('never exceeds what a campaign still needs and spills the rest', () => {
    const lines = splitDonation(10_000, [c('a', 1_000), c('b', 1e6)]);
    expect(lines).toEqual([
      { campaignId: 'a', cents: 1_000, reason: 'r' },
      { campaignId: 'b', cents: 9_000, reason: 'r' },
    ]);
  });

  it('caps at three campaigns and skips fully funded ones', () => {
    const lines = splitDonation(300, [
      c('x', 0),
      c('a', 1e6),
      c('b', 1e6),
      c('c', 1e6),
      c('d', 1e6),
    ]);
    expect(lines.map((l) => l.campaignId)).toEqual(['a', 'b', 'c']);
  });

  it('rejects donations larger than the selected campaigns can absorb', () => {
    expect(() => splitDonation(5_000, [c('a', 100), c('b', 100)])).toThrow(/exceeds/);
  });

  it('rejects non-positive or fractional amounts', () => {
    expect(() => splitDonation(0, [c('a', 100)])).toThrow();
    expect(() => splitDonation(10.5, [c('a', 100)])).toThrow();
  });
});
