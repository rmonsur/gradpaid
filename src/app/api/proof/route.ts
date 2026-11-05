import { z } from 'zod';
import { ok, fail, handle } from '@/lib/http';
import { traceByPayPalRef, listRecentProofRefs } from '@/features/proof/service';
import { createPayPalToolkit } from '@/lib/paypal/toolkit';
import { getPayoutBatch } from '@/lib/paypal/payouts';
import { enforceRateLimit } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/lib/rate-limits';
import { logger } from '@/lib/logger';

const HTTP_NOT_FOUND = 404;
const RECENT_REFS = 5;
const MAX_REF_CHARS = 64;

const querySchema = z.object({
  ref: z
    .string()
    .trim()
    .max(MAX_REF_CHARS)
    .regex(/^[A-Za-z0-9_-]*$/)
    .optional(),
});

/** Asks PayPal for each payout batch's current status, so the proof is PayPal's word, not ours. */
async function livePayoutStatus(batchIds: readonly string[]): Promise<Record<string, string>> {
  if (batchIds.length === 0) {
    return {};
  }
  const { toolkit } = createPayPalToolkit({});
  const entries = await Promise.all(
    batchIds.map(async (id) => {
      try {
        return [id, (await getPayoutBatch(toolkit, id)).batchStatus] as const;
      } catch (err) {
        logger.warn({ err, batchId: id }, 'payout batch lookup failed');
        return [id, 'UNAVAILABLE'] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

export async function GET(req: Request): Promise<Response> {
  const limited = enforceRateLimit(req, RATE_LIMITS.proof);
  if (limited) {
    return limited;
  }
  return handle<unknown>(async () => {
    const { ref } = querySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
    if (!ref) {
      return ok({ recent: await listRecentProofRefs(RECENT_REFS) });
    }
    const trace = await traceByPayPalRef(ref);
    if (!trace) {
      return fail('No GradPaid movement has that PayPal reference', HTTP_NOT_FOUND);
    }
    const batchIds = trace.legs.flatMap((l) => (l.payoutBatchId ? [l.payoutBatchId] : []));
    return ok({ trace, paypalPayoutStatus: await livePayoutStatus(batchIds) });
  });
}
