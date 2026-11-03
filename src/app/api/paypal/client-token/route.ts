import { ok, handle } from '@/lib/http';
import { getBrowserClientToken } from '@/lib/paypal/client-token';
import { enforceRateLimit } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/lib/rate-limits';

export async function GET(req: Request): Promise<Response> {
  const limited = enforceRateLimit(req, RATE_LIMITS.clientToken);
  if (limited) {
    return limited;
  }
  return handle(async () => ok({ accessToken: await getBrowserClientToken() }));
}
