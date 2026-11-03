import { ok, handle } from '@/lib/http';
import { getBrowserClientToken } from '@/lib/paypal/client-token';

export async function GET(): Promise<Response> {
  return handle(async () => ok({ accessToken: await getBrowserClientToken() }));
}
