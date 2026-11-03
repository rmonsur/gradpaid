import { ok, handle } from '@/lib/http';
import { listLedger } from '@/features/ledger/service';

export async function GET(): Promise<Response> {
  return handle(async () => ok(await listLedger()));
}
