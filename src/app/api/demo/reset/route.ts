import { ok, fail, handle, checkInternalAuth } from '@/lib/http';
import { resetDemo } from '@/features/demo/seed';
import { getEnv } from '@/lib/env';

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    if (!checkInternalAuth(req, ['demo'])) {
      return fail('Unauthorized', 401);
    }
    return ok(await resetDemo(getEnv().PAYPAL_SPONSOR_EMAIL));
  });
}
