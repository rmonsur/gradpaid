import { z } from 'zod';
import { ok, fail, handle } from '@/lib/http';
import { createPayPalToolkit } from '@/lib/paypal/toolkit';
import { getOrderByPayPalId, markCaptured } from '@/features/giving/service';
import { parsePayPalAmount } from '@/lib/money';
import { logger } from '@/lib/logger';
import { parseToolResult } from '@/lib/paypal/results';

const bodySchema = z.object({ orderId: z.string().min(5) });

interface CaptureResponse {
  readonly id?: string;
  readonly status?: string;
  readonly purchase_units?: readonly {
    readonly payments?: {
      readonly captures?: readonly {
        readonly id: string;
        readonly status: string;
        readonly amount?: { readonly value: string; readonly currency_code: string };
      }[];
    };
  }[];
}

/**
 * Captures an approved PayPal order through the Agent Toolkit's pay_order tool, then
 * records pledges. Idempotent: repeated calls for a captured order return the same result.
 */
export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const { orderId } = bodySchema.parse(await req.json());
    const existing = await getOrderByPayPalId(orderId);
    if (!existing) {
      return fail('Unknown order', 404);
    }
    if (existing.status === 'captured') {
      return ok({ orderId, captureId: existing.paypalCaptureId, status: 'captured' });
    }
    const { tools } = createPayPalToolkit(
      { orders: { capture: true, get: true } },
      `capture-${orderId}`,
    );
    const payOrder = tools.pay_order;
    if (!payOrder.execute) {
      return fail('pay_order tool unavailable', 500);
    }
    const raw = parseToolResult(
      await payOrder.execute({ id: orderId }, { toolCallId: orderId, messages: [] }),
    ) as CaptureResponse;
    const capture = raw.purchase_units?.[0]?.payments?.captures?.[0];
    if (!capture || capture.status !== 'COMPLETED') {
      return fail(
        `Capture not completed (status ${capture?.status ?? raw.status ?? 'unknown'})`,
        502,
      );
    }
    const capturedCents = capture.amount ? parsePayPalAmount(capture.amount.value) : -1;
    const currencyOk = capture.amount?.currency_code === existing.currency;
    if (capturedCents !== existing.totalCents || !currencyOk) {
      logger.error(
        { orderId, capturedCents, expected: existing.totalCents },
        'capture amount mismatch',
      );
      return fail('Captured amount does not match the recorded order', 409);
    }
    const updated = await markCaptured(orderId, capture.id);
    return ok({ orderId, captureId: capture.id, status: updated?.status ?? 'captured' });
  });
}
