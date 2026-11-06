import { describe, it, expect } from 'vitest';
import { webhookAction } from '@/lib/paypal/webhook-action';

describe('webhookAction', () => {
  it('maps an order capture to a capture action', () => {
    expect(
      webhookAction({
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: { id: 'CAP1', supplementary_data: { related_ids: { order_id: 'ORD1' } } },
      }),
    ).toEqual({ kind: 'capture', orderId: 'ORD1', captureId: 'CAP1' });
  });

  it('maps a payout batch success to a settled batch', () => {
    expect(
      webhookAction({
        event_type: 'PAYMENT.PAYOUTSBATCH.SUCCESS',
        resource: { batch_header: { payout_batch_id: 'B1', batch_status: 'SUCCESS' } },
      }),
    ).toEqual({ kind: 'payout-batch', batchId: 'B1', batchStatus: 'SUCCESS' });
  });

  it('maps a denied payout batch so the disbursement can be retried', () => {
    expect(
      webhookAction({
        event_type: 'PAYMENT.PAYOUTSBATCH.DENIED',
        resource: { batch_header: { payout_batch_id: 'B2', batch_status: 'DENIED' } },
      }),
    ).toEqual({ kind: 'payout-batch', batchId: 'B2', batchStatus: 'DENIED' });
  });

  it('maps a paid invoice to a sponsor payment', () => {
    expect(
      webhookAction({
        event_type: 'INVOICING.INVOICE.PAID',
        resource: { invoice: { id: 'INV2-1' } },
      }),
    ).toEqual({ kind: 'invoice-paid', invoiceId: 'INV2-1' });
  });

  it('ignores events it does not handle or that lack ids', () => {
    expect(webhookAction({ event_type: 'CUSTOMER.DISPUTE.CREATED', resource: {} })).toEqual({
      kind: 'ignore',
    });
    expect(webhookAction({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: {} })).toEqual({
      kind: 'ignore',
    });
  });
});
