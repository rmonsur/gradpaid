import { describe, it, expect, beforeAll } from 'vitest';
import { resetDemo } from '@/features/demo/seed';
import { searchCampaigns } from '@/features/search/service';

describe('campaign search with Elastic unconfigured', () => {
  beforeAll(async () => {
    await resetDemo('sponsor@example.com', { seedDonation: false });
  });

  it('falls back to postgres and ranks the nursing campaign first for "nursing"', async () => {
    const { results, engine } = await searchCampaigns('nursing');
    expect(engine).toBe('postgres');
    expect(results[0]?.fieldOfStudy).toBe('Nursing');
  });

  it('returns every active campaign for an empty query', async () => {
    const { results } = await searchCampaigns('');
    expect(results.map((c) => c.fieldOfStudy).sort()).toEqual([
      'Education',
      'Nursing',
      'Social Work',
    ]);
  });

  it('returns an empty array, not an error, when nothing matches', async () => {
    const { results } = await searchCampaigns('quantum basketweaving zanzibar');
    expect(results).toEqual([]);
  });
});
