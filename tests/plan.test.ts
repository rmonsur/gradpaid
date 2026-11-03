import { describe, it, expect } from 'vitest';
import { planDisbursements } from '@/features/disbursement/plan';

describe('planDisbursements', () => {
  it('groups pledges by campaign, drops tiny groups, and sorts largest first', () => {
    const plan = planDisbursements(
      [
        { id: 'p1', campaignId: 'a', cents: 500 },
        { id: 'p2', campaignId: 'a', cents: 700 },
        { id: 'p3', campaignId: 'b', cents: 300 },
        { id: 'p4', campaignId: 'c', cents: 5000 },
      ],
      1000,
    );
    expect(plan).toEqual([
      { campaignId: 'c', amountCents: 5000, pledgeIds: ['p4'] },
      { campaignId: 'a', amountCents: 1200, pledgeIds: ['p1', 'p2'] },
    ]);
  });
  it('returns an empty plan when nothing qualifies', () => {
    expect(planDisbursements([], 1000)).toEqual([]);
  });
});
