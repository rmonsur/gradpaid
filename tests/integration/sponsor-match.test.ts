import { describe, it, expect, beforeAll } from 'vitest';
import { resetDemo } from '@/features/demo/seed';
import { recordOrder, markCaptured } from '@/features/giving/service';
import {
  listSponsorMatchDue,
  listSponsors,
  recordInvoice,
  getSponsor,
} from '@/features/sponsors/service';

const FIRST_GIFT_CENTS = 60_000;

async function giveToCampaign(orderId: string, campaignId: string, cents: number): Promise<void> {
  await recordOrder({
    paypalOrderId: orderId,
    donorName: 'Match Donor',
    totalCents: cents,
    split: [{ campaignId, cents, reason: 'nursing' }],
  });
  await markCaptured(orderId, `${orderId}-CAPTURE`);
}

describe('sponsor match due', () => {
  let nursingCampaignId = '';
  let sponsorId = '';

  beforeAll(async () => {
    const seeded = await resetDemo('sponsor@example.com', { seedDonation: false });
    nursingCampaignId = seeded.campaignIds[0];
    sponsorId = (await listSponsors())[0].id;
  });

  it('owes a 1:1 sponsor the full amount of the first gift on its cohort', async () => {
    await giveToCampaign('MATCH-ORDER-1', nursingCampaignId, FIRST_GIFT_CENTS);
    const due = await listSponsorMatchDue();
    expect(due).toEqual([
      {
        sponsorId,
        sponsorName: 'Buckeye Alumni Health Fund',
        cohortTag: 'nursing',
        dueCents: 60_000,
      },
    ]);
  });

  it('recording an invoice advances the sponsor matchedCents by the invoiced amount', async () => {
    await recordInvoice({
      sponsorId,
      paypalInvoiceId: 'INV2-MATCH-1',
      amountCents: FIRST_GIFT_CENTS,
      status: 'sent',
    });
    expect((await getSponsor(sponsorId))?.matchedCents).toBe(60_000);
  });

  it('caps a second gift of the same size at the remaining headroom under the sponsor cap', async () => {
    await giveToCampaign('MATCH-ORDER-2', nursingCampaignId, FIRST_GIFT_CENTS);
    const due = await listSponsorMatchDue();
    expect(due.map((d) => d.dueCents)).toEqual([40_000]);
  });
});
