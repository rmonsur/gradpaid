import { describe, it, expect, beforeAll } from 'vitest';
import { resetDemo } from '@/features/demo/seed';
import { startRun } from '@/features/runs/service';
import {
  openDisbursementForCampaign,
  recordPayoutSent,
} from '@/features/disbursement/service';
import { traceByPayPalRef } from '@/features/proof/service';

const CAPTURE = 'SEED-DEMO-CAPTURE';
const BATCH = 'BATCH-PROOF-1';

describe('traceByPayPalRef', () => {
  beforeAll(async () => {
    const { campaignIds } = await resetDemo('sponsor@example.com', { seedDonation: true });
    const run = await startRun('disbursement', 'test');
    const opened = await openDisbursementForCampaign(campaignIds[0], run.id);
    if ('error' in opened) {
      throw new Error(opened.error);
    }
    await recordPayoutSent(opened.id, { batchId: BATCH, batchStatus: 'PENDING' }, run.id);
  });

  it('follows a donation capture to every campaign leg and the payout that paid it', async () => {
    const trace = await traceByPayPalRef(CAPTURE);
    expect(trace?.donation).toMatchObject({ paypalCaptureId: CAPTURE, totalCents: 10_000 });
    expect(trace?.legs.map((l) => l.cents)).toEqual([6_000, 4_000]);
    expect(trace?.legs[0]).toMatchObject({ payoutBatchId: BATCH, payoutStatus: 'sent' });
    expect(trace?.legs[1]).toMatchObject({ payoutBatchId: null, payoutStatus: 'waiting' });
  });

  it('finds the same donation from the payout batch id', async () => {
    const trace = await traceByPayPalRef(BATCH);
    expect(trace?.donation.paypalCaptureId).toBe(CAPTURE);
  });

  it('never exposes a full loan account number', async () => {
    const trace = await traceByPayPalRef(CAPTURE);
    expect(trace?.legs.every((l) => /^\*{4}\d{4}$/.test(l.loanRefMasked))).toBe(true);
  });

  it('returns undefined for a reference it has never seen', async () => {
    expect(await traceByPayPalRef('NOPE-123')).toBeUndefined();
  });
});
