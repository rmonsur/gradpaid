import { describe, it, expect, beforeAll } from 'vitest';
import { resetDemo } from '@/features/demo/seed';
import {
  recordOrder,
  markCaptured,
  listUndisbursedPledges,
  getOrderByPayPalId,
} from '@/features/giving/service';
import { getCampaign } from '@/features/campaigns/service';
import { listLedger } from '@/features/ledger/service';

const ORDER_ID = 'PAYPAL-ORDER-RACE';
const CAPTURE_ID = 'CAPTURE-RACE';
const CONCURRENT_CALLERS = 4;

describe('markCaptured under concurrent webhook and polling callers', () => {
  let campaignId = '';

  beforeAll(async () => {
    const { campaignIds } = await resetDemo('sponsor@example.com', { seedDonation: false });
    campaignId = campaignIds[0];
    await recordOrder({
      paypalOrderId: ORDER_ID,
      donorName: 'Race Donor',
      totalCents: 10_000,
      split: [
        { campaignId, cents: 6_000, reason: 'nursing' },
        { campaignId: campaignIds[1], cents: 4_000, reason: 'teaching' },
      ],
    });
  });

  it('creates pledges, raised totals and ledger rows exactly once', async () => {
    await Promise.all(
      Array.from({ length: CONCURRENT_CALLERS }, () => markCaptured(ORDER_ID, CAPTURE_ID)),
    );
    const pledges = await listUndisbursedPledges();
    const campaign = await getCampaign(campaignId);
    const captured = (await listLedger()).filter((e) => e.kind === 'donation_captured');
    const order = await getOrderByPayPalId(ORDER_ID);

    expect(pledges).toHaveLength(2);
    expect(campaign?.raisedCents).toBe(6_000);
    expect(captured).toHaveLength(2);
    expect(order?.status).toBe('captured');
  });
});
