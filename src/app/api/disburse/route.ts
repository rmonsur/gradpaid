import { z } from 'zod';
import { ok, fail, handle, checkInternalAuth } from '@/lib/http';
import { runDisbursementAgent } from '@/lib/agents/disbursement-agent';
import { RunInProgressError } from '@/features/runs/service';
import { enforceRateLimit } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/lib/rate-limits';

export const maxDuration = 120;

const HTTP_CONFLICT = 409;

const bodySchema = z.object({
  dryRun: z.boolean().default(false),
  trigger: z.string().default('manual'),
});

export async function POST(req: Request): Promise<Response> {
  const limited = enforceRateLimit(req, RATE_LIMITS.internal);
  if (limited) {
    return limited;
  }
  return handle(async () => {
    if (!checkInternalAuth(req, ['cron', 'demo'])) {
      return fail('Unauthorized', 401);
    }
    const text = await req.text();
    const body = bodySchema.parse(text.length > 0 ? JSON.parse(text) : {});
    try {
      return ok(await runDisbursementAgent(body.trigger, body.dryRun));
    } catch (err) {
      if (err instanceof RunInProgressError) {
        return fail(
          'A disbursement run is already in progress. Try again in a minute.',
          HTTP_CONFLICT,
        );
      }
      throw err;
    }
  });
}
