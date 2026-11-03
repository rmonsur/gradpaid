import { describe, it, expect, beforeAll } from 'vitest';
import { resetDemo, SEED_DONATION_CENTS } from '@/features/demo/seed';
import { listUndisbursedPledges } from '@/features/giving/service';
import { planDisbursements } from '@/features/disbursement/plan';
import { listActiveCampaigns } from '@/features/campaigns/service';

describe('demo reset seeds a captured donation', () => {
  beforeAll(async () => {
    await resetDemo('sponsor@example.com');
  });

  it('leaves undisbursed pledges that sum to the seeded gift', async () => {
    const pending = await listUndisbursedPledges();
    const total = pending.reduce((sum, p) => sum + p.cents, 0);
    expect(pending.length).toBeGreaterThan(0);
    expect(total).toBe(SEED_DONATION_CENTS);
  });

  it('produces a non-empty disbursement plan grouped by servicer', async () => {
    const pending = await listUndisbursedPledges();
    const plan = planDisbursements(pending);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.every((d) => d.amountCents > 0)).toBe(true);
  });

  it('raises campaign totals by the seeded gift', async () => {
    const campaigns = await listActiveCampaigns();
    const raised = campaigns.reduce((sum, c) => sum + c.raisedCents, 0);
    expect(raised).toBe(SEED_DONATION_CENTS);
  });
});
