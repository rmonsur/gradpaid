/** The subset of a PayPal webhook event the app reads. */
export interface WebhookEvent {
  readonly event_type?: string;
  readonly resource?: {
    readonly id?: string;
    readonly supplementary_data?: { readonly related_ids?: { readonly order_id?: string } };
    readonly batch_header?: { readonly payout_batch_id?: string; readonly batch_status?: string };
    readonly invoice?: { readonly id?: string };
  };
}

export type WebhookAction =
  | { readonly kind: 'capture'; readonly orderId: string; readonly captureId: string }
  | { readonly kind: 'payout-batch'; readonly batchId: string; readonly batchStatus: string }
  | { readonly kind: 'invoice-paid'; readonly invoiceId: string }
  | { readonly kind: 'ignore' };

const IGNORE: WebhookAction = { kind: 'ignore' };

export const HANDLED_WEBHOOK_EVENTS = [
  'PAYMENT.CAPTURE.COMPLETED',
  'PAYMENT.PAYOUTSBATCH.SUCCESS',
  'PAYMENT.PAYOUTSBATCH.DENIED',
  'INVOICING.INVOICE.PAID',
] as const;

/** Pure mapping from a verified PayPal event to what the ledger should do about it. */
export function webhookAction(event: WebhookEvent): WebhookAction {
  const r = event.resource;
  switch (event.event_type) {
    case 'PAYMENT.CAPTURE.COMPLETED': {
      const orderId = r?.supplementary_data?.related_ids?.order_id;
      return orderId && r?.id ? { kind: 'capture', orderId, captureId: r.id } : IGNORE;
    }
    case 'PAYMENT.PAYOUTSBATCH.SUCCESS':
    case 'PAYMENT.PAYOUTSBATCH.DENIED': {
      const batchId = r?.batch_header?.payout_batch_id;
      const batchStatus = r?.batch_header?.batch_status;
      return batchId && batchStatus ? { kind: 'payout-batch', batchId, batchStatus } : IGNORE;
    }
    case 'INVOICING.INVOICE.PAID': {
      const invoiceId = r?.invoice?.id;
      return invoiceId ? { kind: 'invoice-paid', invoiceId } : IGNORE;
    }
    default:
      return IGNORE;
  }
}
