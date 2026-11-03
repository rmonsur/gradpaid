import { ok, handle } from '@/lib/http';
import { listRuns } from '@/features/runs/service';

export async function GET(): Promise<Response> {
  return handle(async () => ok(await listRuns()));
}
