import { tool, type Tool } from 'ai';
import { z } from 'zod';
import type { PayPalAgentToolkit } from '@paypal/agent-toolkit/ai-sdk';
import { sendPayout, getPayoutBatch, type PayoutRequest, type PayoutResult } from './payouts';
import { MAX_PAYOUT_PER_RUN_CENTS } from '@/lib/constants';

export interface ResolvedPayout {
  readonly id: string;
  readonly amountCents: number;
  readonly note: string;
}

/**
 * Everything the payout tool needs from the server. The model supplies only a disbursement id;
 * the amount, receiver and bookkeeping all come from here.
 */
export interface PayoutDeps {
  /** The single PayPal account payouts may go to (the loan servicer). */
  readonly receiverEmail: string;
  readonly dryRun: boolean;
  readonly resolve: (disbursementId: string) => Promise<ResolvedPayout | undefined>;
  readonly spentCents: () => Promise<number>;
  readonly onSent: (disbursementId: string, result: PayoutResult) => Promise<void>;
  readonly onFailed: (disbursementId: string, detail: string) => Promise<void>;
  readonly onBatchStatus?: (batchId: string, batchStatus: string) => Promise<void>;
}

/** The money-moving boundary; injectable so the guard can be tested without PayPal. */
export type SendPayoutFn = (
  toolkit: PayPalAgentToolkit,
  req: PayoutRequest,
) => Promise<PayoutResult>;

const sendPayoutInput = z.object({
  disbursementId: z
    .string()
    .min(1)
    .describe('Disbursement id returned by open_disbursement. The amount comes from the server.'),
});

/**
 * Custom tools in the same shape as the official PayPal Agent Toolkit tools, covering the
 * Payouts API which the toolkit does not yet ship. The receiver is fixed, the amount is read
 * from the disbursement row, and the per-run cap is checked against what was actually sent.
 */
export function createPayoutTools(
  toolkit: PayPalAgentToolkit,
  deps: PayoutDeps,
  send: SendPayoutFn = sendPayout,
): Readonly<Record<string, Tool>> {
  return {
    send_payout: tool({
      description:
        'Send the PayPal payout for an opened disbursement to the loan servicer. Use exactly once per disbursement id. Returns the payout batch id, status and amount.',
      parameters: sendPayoutInput,
      execute: async ({ disbursementId }): Promise<unknown> => {
        const order = await deps.resolve(disbursementId);
        if (!order) {
          return { error: 'unknown or already paid disbursement' };
        }
        if ((await deps.spentCents()) + order.amountCents > MAX_PAYOUT_PER_RUN_CENTS) {
          return { error: 'per-run payout cap exceeded' };
        }
        const request: PayoutRequest = {
          disbursementId: order.id,
          receiverEmail: deps.receiverEmail,
          amountCents: order.amountCents,
          note: order.note,
        };
        if (deps.dryRun) {
          return { simulated: true, dryRun: true, ...request };
        }
        try {
          const result = await send(toolkit, request);
          await deps.onSent(order.id, result);
          return { ...result, amountCents: order.amountCents };
        } catch (err) {
          const detail = err instanceof Error ? err.message : 'unknown error';
          await deps.onFailed(order.id, detail);
          return { error: 'payout failed', detail };
        }
      },
    }),
    get_payout_batch: tool({
      description: 'Look up the status of a PayPal payout batch by batch id.',
      parameters: z.object({ batchId: z.string().min(1) }),
      execute: async ({ batchId }): Promise<unknown> => {
        const result = await getPayoutBatch(toolkit, batchId);
        await deps.onBatchStatus?.(batchId, result.batchStatus);
        return result;
      },
    }),
  };
}
