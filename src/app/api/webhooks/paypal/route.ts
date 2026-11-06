import { ok, fail, handle } from '@/lib/http';
import { getEnv } from '@/lib/env';
import { createPayPalToolkit } from '@/lib/paypal/toolkit';
import { readWebhookHeaders, verifyWebhookSignature } from '@/lib/paypal/webhooks';
import { webhookAction, type WebhookEvent } from '@/lib/paypal/webhook-action';
import { markCaptured } from '@/features/giving/service';
import { recordPayoutBatchStatus } from '@/features/disbursement/service';
import { markInvoicePaid } from '@/features/sponsors/service';
import { logger } from '@/lib/logger';

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;

/**
 * PayPal pushes settlement here: order captures, payout batch outcomes and paid sponsor
 * invoices. Every event is signature-verified with PayPal before the ledger is touched, and
 * every handler is idempotent so redelivery is harmless.
 */
export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const env = getEnv();
    const headers = readWebhookHeaders(req.headers);
    const event = (await req.json()) as WebhookEvent;
    if (!env.PAYPAL_WEBHOOK_ID || !headers) {
      return fail('Webhook not configured', HTTP_BAD_REQUEST);
    }
    const { toolkit } = createPayPalToolkit({});
    const valid = await verifyWebhookSignature(toolkit, env.PAYPAL_WEBHOOK_ID, headers, event);
    if (!valid) {
      return fail('Invalid signature', HTTP_UNAUTHORIZED);
    }
    const action = webhookAction(event);
    switch (action.kind) {
      case 'capture':
        await markCaptured(action.orderId, action.captureId);
        break;
      case 'payout-batch':
        await recordPayoutBatchStatus(action.batchId, action.batchStatus);
        break;
      case 'invoice-paid':
        await markInvoicePaid(action.invoiceId);
        break;
      case 'ignore':
        break;
    }
    logger.info({ eventType: event.event_type, action: action.kind }, 'webhook processed');
    return ok({ received: true });
  });
}
