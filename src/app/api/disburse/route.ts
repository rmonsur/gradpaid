import { z } from 'zod';
import { ok, fail, handle, checkInternalAuth } from '@/lib/http';
import { runDisbursementAgent } from '@/lib/agents/disbursement-agent';

export const maxDuration = 120;

const bodySchema = z.object({
  dryRun: z.boolean().default(false),
  trigger: z.string().default('manual'),
});

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    if (!checkInternalAuth(req, ['cron', 'demo'])) {
      return fail('Unauthorized', 401);
    }
    const text = await req.text();
    const body = bodySchema.parse(text.length > 0 ? JSON.parse(text) : {});
    const result = await runDisbursementAgent(body.trigger, body.dryRun);
    return ok(result);
  });
}
