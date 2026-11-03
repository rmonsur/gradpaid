import type { PayPalAgentToolkit } from '@paypal/agent-toolkit/ai-sdk';
import { paypalRest } from './rest';

export interface WebhookHeaders {
  readonly authAlgo: string;
  readonly certUrl: string;
  readonly transmissionId: string;
  readonly transmissionSig: string;
  readonly transmissionTime: string;
}

export function readWebhookHeaders(headers: Headers): WebhookHeaders | null {
  const get = (k: string): string | null => headers.get(k);
  const authAlgo = get('paypal-auth-algo');
  const certUrl = get('paypal-cert-url');
  const transmissionId = get('paypal-transmission-id');
  const transmissionSig = get('paypal-transmission-sig');
  const transmissionTime = get('paypal-transmission-time');
  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return null;
  }
  return { authAlgo, certUrl, transmissionId, transmissionSig, transmissionTime };
}

/** Asks PayPal to verify the webhook signature. Returns true only on SUCCESS. */
export async function verifyWebhookSignature(
  toolkit: PayPalAgentToolkit,
  webhookId: string,
  headers: WebhookHeaders,
  event: unknown,
): Promise<boolean> {
  const res = await paypalRest<{ verification_status: string }>(toolkit, {
    method: 'POST',
    path: '/v1/notifications/verify-webhook-signature',
    body: {
      auth_algo: headers.authAlgo,
      cert_url: headers.certUrl,
      transmission_id: headers.transmissionId,
      transmission_sig: headers.transmissionSig,
      transmission_time: headers.transmissionTime,
      webhook_id: webhookId,
      webhook_event: event,
    },
  });
  return res.verification_status === 'SUCCESS';
}
