import { tool, type Tool } from 'ai';
import { z } from 'zod';
import type { PayPalAgentToolkit } from '@paypal/agent-toolkit/ai-sdk';
import { sendPayout, getPayoutBatch, type PayoutRequest, type PayoutResult } from './payouts';
import { MAX_PAYOUT_PER_RUN_CENTS } from '@/lib/constants';

export interface PayoutGuard {
  /** Only these receiver emails may ever be paid. */
  readonly allowedReceivers: readonly string[];
  /** Running total for this agent run; enforced against MAX_PAYOUT_PER_RUN_CENTS. */
  readonly spent: { value: number };
  readonly dryRun: boolean;
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
    .describe('Internal disbursement id. Reused as the idempotency key.'),
  receiverEmail: z.string().email().describe('PayPal email of the loan servicer account.'),
  amountCents: z.number().int().positive().describe('Amount in integer cents.'),
  note: z
    .string()
    .max(200)
    .describe('Short memo visible to the receiver, e.g. loan account reference.'),
});

/**
 * Custom tools in the same shape as the official PayPal Agent Toolkit tools, covering the
 * Payouts API which the toolkit does not yet ship. Guarded by a receiver allowlist and a
 * per-run spending cap so the model can never invent a recipient or overspend.
 */
export function createPayoutTools(
  toolkit: PayPalAgentToolkit,
  guard: PayoutGuard,
  send: SendPayoutFn = sendPayout,
): Readonly<Record<string, Tool>> {
  return {
    send_payout: tool({
      description:
        'Send a PayPal payout to a loan servicer account. Use exactly once per disbursement id. Returns the payout batch id and status.',
      parameters: sendPayoutInput,
      execute: async (input): Promise<unknown> => {
        if (!guard.allowedReceivers.includes(input.receiverEmail)) {
          return { error: 'receiver not allowlisted' };
        }
        if (guard.spent.value + input.amountCents > MAX_PAYOUT_PER_RUN_CENTS) {
          return { error: 'per-run payout cap exceeded' };
        }
        if (guard.dryRun) {
          return { simulated: true, dryRun: true, wouldSend: input };
        }
        const result = await send(toolkit, input);
        guard.spent.value += input.amountCents;
        return result;
      },
    }),
    get_payout_batch: tool({
      description: 'Look up the status of a PayPal payout batch by batch id.',
      parameters: z.object({ batchId: z.string().min(1) }),
      execute: async ({ batchId }): Promise<unknown> => getPayoutBatch(toolkit, batchId),
    }),
  };
}
