import { describe, it, expect, beforeAll, vi } from 'vitest';
import { resetDemo } from '@/features/demo/seed';
import { recordOrder, getOrderByPayPalId } from '@/features/giving/service';
import { POST } from '@/app/api/checkout/capture/route';

const ORDER_ID = 'PAYPAL-ORDER-MISMATCH';

function captured(orderId: string, captureId: string, value: string): string {
  return JSON.stringify({
    id: orderId,
    status: 'COMPLETED',
    purchase_units: [
      {
        payments: {
          captures: [
            { id: captureId, status: 'COMPLETED', amount: { value, currency_code: 'USD' } },
          ],
        },
      },
    ],
  });
}

vi.mock('@/lib/paypal/toolkit', () => ({
  createPayPalToolkit: (): unknown => ({
    toolkit: {},
    tools: {
      get_order: {
        execute: async ({ id }: { id: string }): Promise<string> =>
          captured(id, 'CAPTURE-ALREADY', '100.00'),
      },
      pay_order: {
        execute: async ({ id }: { id: string }): Promise<string> => {
          if (id === 'PAYPAL-ORDER-ALREADY') {
            throw new Error('ORDER_ALREADY_CAPTURED');
          }
          return JSON.stringify({
            id: 'PAYPAL-ORDER-MISMATCH',
            status: 'COMPLETED',
            purchase_units: [
              {
                payments: {
                  captures: [
                    {
                      id: 'CAPTURE-SHORT',
                      status: 'COMPLETED',
                      amount: { value: '95.00', currency_code: 'USD' },
                    },
                  ],
                },
              },
            ],
          });
        },
      },
    },
  }),
}));

describe('POST /api/checkout/capture', () => {
  beforeAll(async () => {
    const { campaignIds } = await resetDemo('sponsor@example.com', { seedDonation: false });
    await recordOrder({
      paypalOrderId: ORDER_ID,
      donorName: 'Mismatch Donor',
      totalCents: 10_000,
      split: [{ campaignId: campaignIds[0], cents: 10_000, reason: 'nursing' }],
    });
  });

  it('responds 409 and leaves the order uncaptured when PayPal captured a different amount', async () => {
    const res = await POST(
      new Request('http://localhost/api/checkout/capture', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId: ORDER_ID }),
      }),
    );
    expect(res.status).toBe(409);
    const order = await getOrderByPayPalId(ORDER_ID);
    expect(order?.status).toBe('created');
    expect(order?.paypalCaptureId).toBeNull();
  });
});

describe('POST /api/checkout/capture when pay_order throws but the order is already captured', () => {
  it('falls back to get_order and records the capture', async () => {
    const { campaignIds } = await resetDemo('sponsor@example.com', { seedDonation: false });
    await recordOrder({
      paypalOrderId: 'PAYPAL-ORDER-ALREADY',
      donorName: 'Retry Donor',
      totalCents: 10_000,
      split: [{ campaignId: campaignIds[0], cents: 10_000, reason: 'nursing' }],
    });
    const res = await POST(
      new Request('http://localhost/api/checkout/capture', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId: 'PAYPAL-ORDER-ALREADY' }),
      }),
    );
    expect(res.status).toBe(200);
    const order = await getOrderByPayPalId('PAYPAL-ORDER-ALREADY');
    expect(order?.status).toBe('captured');
    expect(order?.paypalCaptureId).toBe('CAPTURE-ALREADY');
  });
});
