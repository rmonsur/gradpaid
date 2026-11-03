import { z } from 'zod';
import type { Tool } from 'ai';
import { ok, fail, handle } from '@/lib/http';
import { createPayPalToolkit } from '@/lib/paypal/toolkit';
import { getOrderByPayPalId, markCaptured } from '@/features/giving/service';
import { parsePayPalAmount } from '@/lib/money';
import { logger } from '@/lib/logger';
import { parseToolResult } from '@/lib/paypal/results';
import { enforceRateLimit } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/lib/rate-limits';

const bodySchema = z.object({ orderId: z.string().min(5) });

const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_BAD_GATEWAY = 502;
const UNKNOWN_AMOUNT = -1;

interface Capture {
  readonly id: string;
  readonly status: string;
  readonly amount?: { readonly value: string; readonly currency_code: string };
}

interface OrderResponse {
  readonly id?: string;
  readonly status?: string;
  readonly purchase_units?: readonly {
    readonly payments?: { readonly captures?: readonly Capture[] };
  }[];
}

async function callOrderTool(tool: Tool | undefined, orderId: string): Promise<OrderResponse> {
  if (!tool?.execute) {
    throw new Error('order tool unavailable');
  }
  return parseToolResult(
    await tool.execute({ id: orderId }, { toolCallId: orderId, messages: [] }),
  ) as OrderResponse;
}

/**
 * Captures through pay_order; if PayPal rejects the capture (for example because an earlier
 * timed-out call already captured it), reads the order back with get_order and uses that.
 */
async function captureOrRead(
  tools: Readonly<Record<string, Tool>>,
  orderId: string,
): Promise<OrderResponse> {
  try {
    return await callOrderTool(tools.pay_order, orderId);
  } catch (err) {
    logger.warn({ err, orderId }, 'pay_order failed, reading order back');
    return callOrderTool(tools.get_order, orderId);
  }
}

/**
 * Captures an approved PayPal order through the Agent Toolkit's pay_order tool, then
 * records pledges. Idempotent: repeated calls for a captured order return the same result.
 */
export async function POST(req: Request): Promise<Response> {
  const limited = enforceRateLimit(req, RATE_LIMITS.checkout);
  if (limited) {
    return limited;
  }
  return handle(async () => {
    const { orderId } = bodySchema.parse(await req.json());
    const existing = await getOrderByPayPalId(orderId);
    if (!existing) {
      return fail('Unknown order', HTTP_NOT_FOUND);
    }
    if (existing.status === 'captured') {
      return ok({ orderId, captureId: existing.paypalCaptureId, status: 'captured' });
    }
    const { tools } = createPayPalToolkit(
      { orders: { capture: true, get: true } },
      `capture-${orderId}`,
    );
    const raw = await captureOrRead(tools, orderId);
    const capture = raw.purchase_units?.[0]?.payments?.captures?.[0];
    if (!capture || capture.status !== 'COMPLETED') {
      return fail(
        `Capture not completed (status ${capture?.status ?? raw.status ?? 'unknown'})`,
        HTTP_BAD_GATEWAY,
      );
    }
    const capturedCents = capture.amount ? parsePayPalAmount(capture.amount.value) : UNKNOWN_AMOUNT;
    const currencyOk = capture.amount?.currency_code === existing.currency;
    if (capturedCents !== existing.totalCents || !currencyOk) {
      logger.error(
        { orderId, capturedCents, expected: existing.totalCents },
        'capture amount mismatch',
      );
      return fail('Captured amount does not match the recorded order', HTTP_CONFLICT);
    }
    const updated = await markCaptured(orderId, capture.id);
    return ok({ orderId, captureId: capture.id, status: updated?.status ?? 'captured' });
  });
}
