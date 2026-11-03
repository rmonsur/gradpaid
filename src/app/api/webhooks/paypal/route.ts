import { ok, fail, handle } from '@/lib/http';
import { getEnv } from '@/lib/env';
import { createPayPalToolkit } from '@/lib/paypal/toolkit';
import { readWebhookHeaders, verifyWebhookSignature } from '@/lib/paypal/webhooks';
import { markCaptured } from '@/features/giving/service';
import { logger } from '@/lib/logger';

interface WebhookEvent {
  readonly event_type?: string;
  readonly resource?: {
    readonly id?: string;
    readonly status?: string;
    readonly supplementary_data?: { readonly related_ids?: { readonly order_id?: string } };
  };
}

/** Webhook path for order capture. Polling in the capture route is the fallback. */
export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const env = getEnv();
    const headers = readWebhookHeaders(req.headers);
    const event = (await req.json()) as WebhookEvent;
    if (!env.PAYPAL_WEBHOOK_ID || !headers) {
      return fail('Webhook not configured', 400);
    }
    const { toolkit } = createPayPalToolkit({});
    const valid = await verifyWebhookSignature(toolkit, env.PAYPAL_WEBHOOK_ID, headers, event);
    if (!valid) {
      return fail('Invalid signature', 401);
    }
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const orderId = event.resource?.supplementary_data?.related_ids?.order_id;
      const captureId = event.resource?.id;
      if (orderId && captureId) {
        await markCaptured(orderId, captureId);
      }
    }
    logger.info({ eventType: event.event_type }, 'webhook processed');
    return ok({ received: true });
  });
}
