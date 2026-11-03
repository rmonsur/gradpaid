import { describe, it, expect, beforeAll } from 'vitest';
import { resetDemo } from '@/features/demo/seed';
import {
  listActiveCampaigns,
  getCampaign,
  searchCampaignsInPostgres,
} from '@/features/campaigns/service';
import { recordOrder, markCaptured, listUndisbursedPledges } from '@/features/giving/service';
import { planDisbursements } from '@/features/disbursement/plan';
import { listLedger } from '@/features/ledger/service';
import { listMatchRules } from '@/features/sponsors/service';
import { computeMatch } from '@/features/matching/match';

const DONATION_CENTS = 10_000;

describe('money path against postgres', () => {
  let campaignIds: readonly string[] = [];

  beforeAll(async () => {
    const seeded = await resetDemo('sponsor@example.com');
    campaignIds = seeded.campaignIds;
  });

  it('seeds three active campaigns', async () => {
    const active = await listActiveCampaigns();
    expect(active).toHaveLength(3);
    expect(active.every((c) => c.remainingCents === c.goalCents)).toBe(true);
  });

  it('postgres fallback search ranks the nursing campaign first for a nursing query', async () => {
    const results = await searchCampaignsInPostgres('first-gen nursing ohio', 3);
    expect(results[0]?.fieldOfStudy).toBe('Nursing');
  });

  it('records an order, captures it once, creates pledges and ledger rows', async () => {
    const [a, b] = campaignIds;
    const split = [
      { campaignId: a, cents: 6_000, reason: 'nursing' },
      { campaignId: b, cents: 4_000, reason: 'teaching' },
    ];
    await recordOrder({
      paypalOrderId: 'TEST-ORDER-1',
      donorName: 'Test Donor',
      totalCents: DONATION_CENTS,
      split,
    });
    const first = await markCaptured('TEST-ORDER-1', 'CAPTURE-1');
    const second = await markCaptured('TEST-ORDER-1', 'CAPTURE-1');
    expect(first?.status).toBe('captured');
    expect(second?.status).toBe('captured');

    const pledges = await listUndisbursedPledges();
    expect(pledges).toHaveLength(2);
    expect((await getCampaign(a))?.raisedCents).toBe(6_000);

    const ledger = await listLedger();
    expect(ledger.filter((l) => l.kind === 'donation_captured')).toHaveLength(2);
  });

  it('rejects an order whose split does not add up', async () => {
    await expect(
      recordOrder({
        paypalOrderId: 'TEST-ORDER-2',
        donorName: 'x',
        totalCents: 100,
        split: [{ campaignId: campaignIds[0], cents: 99, reason: '' }],
      }),
    ).rejects.toThrow(/does not equal/);
  });

  it('plans one payout per campaign and computes the sponsor match', async () => {
    const plan = planDisbursements(await listUndisbursedPledges());
    expect(plan.map((p) => p.amountCents)).toEqual([6_000, 4_000]);

    const rules = await listMatchRules();
    const nursing = await getCampaign(campaignIds[0]);
    const match = computeMatch(6_000, nursing?.cohortTags ?? [], rules);
    expect(match).toEqual([{ sponsorId: rules[0].sponsorId, matchCents: 6_000 }]);
  });
});
