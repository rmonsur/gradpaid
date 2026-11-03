import { ok, handle, checkInternalAuth } from '@/lib/http';
import { listRuns } from '@/features/runs/service';

/** Tool call payloads are only returned to holders of the demo or cron token. */
export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    const runs = await listRuns();
    if (checkInternalAuth(req, ['demo', 'cron'])) {
      return ok(runs);
    }
    return ok(runs.map((r) => ({ ...r, toolCalls: [] })));
  });
}
