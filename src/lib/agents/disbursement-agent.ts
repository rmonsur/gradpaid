import { generateText } from 'ai';
import { agentModel } from './model';
import { withActivity, createActivityRecorder } from './activity';
import { createPayPalToolkit, DISBURSEMENT_ACTIONS } from '@/lib/paypal/toolkit';
import { createPayoutTools } from '@/lib/paypal/payouts-tool';
import { createDisbursementLocalTools } from './disbursement-tools';
import { startRun, finishRun } from '@/features/runs/service';
import { getEnv } from '@/lib/env';
import { MAX_AGENT_STEPS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import type { ToolCallRecord } from '@/db/schema';

const DISBURSEMENT_STEPS = MAX_AGENT_STEPS * 2;

const SYSTEM_PROMPT = `You are the GradPaid disbursement agent. You move donated money to student loan servicers using PayPal, invoice matching sponsors, and reconcile the ledger. You are precise and never improvise amounts or recipients.

Run this procedure exactly once:
1. get_disbursement_plan. If the plan is empty, skip to step 4.
2. For each planned campaign, in order: open_disbursement, then send_payout using the returned disbursementId as the idempotency key, the servicerEmail from the plan, the amountCents from the plan, and a note containing the masked loan reference. Then close_disbursement with ok=true and the batch id, or ok=false and the error detail.
3. get_sponsor_match_due. For each sponsor with dueCents > 0: create_invoice (currency_code USD, one item named "GradPaid match" with quantity "1" and unit_amount value in dollars, primary_recipients with the sponsorEmail), then send_invoice with send_to_recipient true, then record_sponsor_invoice with the PayPal invoice id.
4. list_transactions for the last 7 days, then record_reconciliation comparing captured donation amounts you can see against the ledger expectations. Report mismatches, never silently fix them.
5. Finish with a two-sentence plain-English summary of what moved.

Convert cents to dollars only when a PayPal tool asks for a dollar string.`;

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
    allowedReceivers: [env.PAYPAL_SERVICER_EMAIL],
    spent: { value: 0 },
    dryRun,
  });
  const tools = withActivity(
    { ...createDisbursementLocalTools(run.id), ...payoutTools, ...paypal.tools },
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
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, runId: run.id }, 'disbursement run failed');
    await finishRun(run.id, 'failed', message, recorder.records);
    throw err;
  }
}
