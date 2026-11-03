import type { PayPalAgentToolkit } from '@paypal/agent-toolkit/ai-sdk';
import { paypalRest } from './rest';
import { toPayPalAmount, DEFAULT_CURRENCY } from '@/lib/money';
import { payoutItemKey } from '@/lib/ids';

export interface PayoutRequest {
  readonly disbursementId: string;
  readonly receiverEmail: string;
  readonly amountCents: number;
  readonly note: string;
}

export interface PayoutBody {
  readonly sender_batch_header: {
    readonly sender_batch_id: string;
    readonly email_subject: string;
    readonly email_message: string;
  };
  readonly items: readonly {
    readonly recipient_type: 'EMAIL';
    readonly receiver: string;
    readonly amount: { readonly value: string; readonly currency: string };
    readonly note: string;
    readonly sender_item_id: string;
  }[];
}

export interface PayoutResult {
  readonly batchId: string;
  readonly batchStatus: string;
  readonly itemId?: string;
}

interface PayoutApiResponse {
  readonly batch_header: { readonly payout_batch_id: string; readonly batch_status: string };
  readonly items?: readonly { readonly payout_item_id: string }[];
}

/** Pure builder so the request shape is unit-testable without network access. */
export function buildPayoutBody(req: PayoutRequest): PayoutBody {
  const key = payoutItemKey(req.disbursementId);
  return {
    sender_batch_header: {
      sender_batch_id: key,
      email_subject: 'GradPaid student loan payment',
      email_message: 'A GradPaid disbursement toward a student loan balance.',
    },
    items: [
      {
        recipient_type: 'EMAIL',
        receiver: req.receiverEmail,
        amount: { value: toPayPalAmount(req.amountCents), currency: DEFAULT_CURRENCY },
        note: req.note,
        sender_item_id: key,
      },
    ],
  };
}

export async function sendPayout(
  toolkit: PayPalAgentToolkit,
  req: PayoutRequest,
): Promise<PayoutResult> {
  const res = await paypalRest<PayoutApiResponse>(toolkit, {
    method: 'POST',
    path: '/v1/payments/payouts',
    body: buildPayoutBody(req),
    requestId: payoutItemKey(req.disbursementId),
  });
  return toPayoutResult(res);
}

export async function getPayoutBatch(
  toolkit: PayPalAgentToolkit,
  batchId: string,
): Promise<PayoutResult> {
  const res = await paypalRest<PayoutApiResponse>(toolkit, {
    method: 'GET',
    path: `/v1/payments/payouts/${encodeURIComponent(batchId)}`,
  });
  return toPayoutResult(res);
}

function toPayoutResult(res: PayoutApiResponse): PayoutResult {
  return {
    batchId: res.batch_header.payout_batch_id,
    batchStatus: res.batch_header.batch_status,
    itemId: res.items?.[0]?.payout_item_id,
  };
}
