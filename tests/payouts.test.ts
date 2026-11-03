import { describe, it, expect } from 'vitest';
import { buildPayoutBody } from '@/lib/paypal/payouts';

describe('buildPayoutBody', () => {
  it('uses the disbursement id as both batch id and item id for idempotency', () => {
    const body = buildPayoutBody({
      disbursementId: 'dsb_abc',
      receiverEmail: 'servicer@example.com',
      amountCents: 12_345,
      note: 'Loan ****1234',
    });
    expect(body.sender_batch_header.sender_batch_id).toBe('gradpaid-dsb_abc');
    expect(body.items[0].sender_item_id).toBe('gradpaid-dsb_abc');
    expect(body.items[0].amount).toEqual({ value: '123.45', currency: 'USD' });
    expect(body.items[0].recipient_type).toBe('EMAIL');
  });
});
