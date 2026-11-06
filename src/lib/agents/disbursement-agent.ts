import { generateText, tool, type Tool } from 'ai';
import { z } from 'zod';
import { agentModel } from './model';
import { withActivity, createActivityRecorder } from './activity';
import { createPayPalToolkit, DISBURSEMENT_ACTIONS } from '@/lib/paypal/toolkit';
import { createPayoutTools } from '@/lib/paypal/payouts-tool';
import { parseToolResult } from '@/lib/paypal/results';
import { createDisbursementLocalTools } from './disbursement-tools';
import { startRun, finishRun } from '@/features/runs/service';
import {
  recordPayoutBatchStatus,
  recordPayoutFailed,
  recordPayoutSent,
  releasePlannedDisbursements,
  resolveDryRunPayout,
  resolvePayoutOrder,
  spentCentsForRun,
} from '@/features/disbursement/service';
import { getEnv } from '@/lib/env';
import { MAX_AGENT_STEPS } from '@/lib/constants';
import { parsePayPalAmount } from '@/lib/money';
import { logger } from '@/lib/logger';
import type { ToolCallRecord } from '@/db/schema';

const DISBURSEMENT_STEPS = MAX_AGENT_STEPS * 2;
const FAILED_SUMMARY = 'Run failed before completing. The error is in the server logs.';

const SYSTEM_PROMPT = `You are the GradPaid disbursement agent. You move donated money to student loan servicers using PayPal, invoice matching sponsors, and reconcile the ledger. Amounts and recipients are decided by the server; you never supply or alter them.

Run this procedure exactly once:
1. get_disbursement_plan. If the plan is empty, skip to step 4.
2. For each planned campaign, in order: open_disbursement with the campaignId, then send_payout with the returned disbursementId. If send_payout returns an error, note it and continue with the next campaign.
3. get_sponsor_match_due. For each sponsor with dueCents > 0: create_invoice (currency_code USD, one item named "GradPaid match" with quantity "1" and unit_amount value equal to dueCents converted to dollars, primary_recipients with the sponsorEmail), then send_invoice with send_to_recipient true, then record_sponsor_invoice with the sponsorId and the PayPal invoice id.
4. get_ledger_expectations for the last 7 days, then list_transactions for the same window, then record_reconciliation: checkedCount is the number of expectations, and each expectation whose PayPal reference or amount is missing from the transaction list is one mismatch. Report mismatches, never silently fix them.
5. Finish with a two-sentence plain-English summary of what moved, in plain sentences with no markdown, bullets or bold.

In dry-run mode every tool simulates its effect and returns simulated: true. Run all five steps exactly as you would for real, do not skip or ask for confirmation, and say clearly in the summary that nothing moved.

If list_transactions fails, continue to record_reconciliation with checkedCount 0 and one mismatch describing the failure.

Convert cents to dollars only when a PayPal tool asks for a dollar string.`;

/** Dry-run stand-ins for the PayPal invoice tools so no sandbox invoice is created. */
function simulatedInvoiceTools(): Readonly<Record<string, Tool>> {
  return {
    create_invoice: tool({
      description: 'Simulated: create a PayPal invoice (dry run).',
      parameters: z.object({}).passthrough(),
      execute: async (): Promise<unknown> => ({
        id: 'INV2-DRYRUN-0000',
        simulated: true,
        dryRun: true,
      }),
    }),
    send_invoice: tool({
      description: 'Simulated: send a PayPal invoice (dry run).',
      parameters: z.object({ invoice_id: z.string() }).passthrough(),
      execute: async (): Promise<unknown> => ({ ok: true, simulated: true, dryRun: true }),
    }),
  };
}

interface InvoiceResponse {
  readonly amount?: { readonly value?: string };
}

/** Reads an invoice back through the Agent Toolkit so the recorded amount is PayPal's, not the model's. */
function invoiceVerifier(
  tools: Readonly<Record<string, Tool>>,
): (paypalInvoiceId: string) => Promise<number | undefined> {
  return async (paypalInvoiceId) => {
    const getInvoice = tools.get_invoice;
    if (!getInvoice?.execute) {
      return undefined;
    }
    const raw = parseToolResult(
      await getInvoice.execute(
        { invoice_id: paypalInvoiceId },
        { toolCallId: paypalInvoiceId, messages: [] },
      ),
    ) as InvoiceResponse;
    const value = raw.amount?.value;
    return value ? parsePayPalAmount(value) : undefined;
  };
}

export interface DisbursementRunResult {
  readonly runId: string;
  readonly summary: string;
  readonly toolCalls: readonly ToolCallRecord[];
  readonly dryRun: boolean;
}

export async function runDisbursementAgent(
  trigger: string,
  dryRun: boolean,
): Promise<DisbursementRunResult> {
  const run = await startRun('disbursement', trigger);
  const recorder = createActivityRecorder();
  const env = getEnv();
  const paypal = createPayPalToolkit(DISBURSEMENT_ACTIONS, run.id);
  const payoutTools = createPayoutTools(paypal.toolkit, {
    receiverEmail: env.PAYPAL_SERVICER_EMAIL,
    dryRun,
    resolve: dryRun ? resolveDryRunPayout : resolvePayoutOrder,
    spentCents: () => spentCentsForRun(run.id),
    onSent: (id, result) => recordPayoutSent(id, result, run.id),
    onFailed: (id, detail) => recordPayoutFailed(id, detail, run.id),
    onBatchStatus: recordPayoutBatchStatus,
  });
  const localTools = createDisbursementLocalTools(run.id, dryRun, {
    verifyInvoiceCents: invoiceVerifier(paypal.tools),
  });
  const tools = withActivity(
    {
      ...localTools,
      ...payoutTools,
      ...paypal.tools,
      ...(dryRun ? simulatedInvoiceTools() : {}),
    },
    recorder,
  );
  try {
    const result = await generateText({
      model: agentModel(),
      system: SYSTEM_PROMPT,
      prompt: dryRun
        ? 'Run the disbursement procedure in dry-run mode. Payouts will not actually send.'
        : 'Run the disbursement procedure now.',
      tools,
      maxSteps: DISBURSEMENT_STEPS,
    });
    await finishRun(run.id, 'success', result.text, recorder.records);
    return { runId: run.id, summary: result.text, toolCalls: recorder.records, dryRun };
  } catch (err) {
    logger.error({ err, runId: run.id }, 'disbursement run failed');
    await finishRun(run.id, 'failed', FAILED_SUMMARY, recorder.records);
    throw err;
  } finally {
    const released = await releasePlannedDisbursements(run.id);
    if (released > 0) {
      logger.warn({ runId: run.id, released }, 'released pledges from unpaid disbursements');
    }
  }
}
