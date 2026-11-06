import { generateText, type Tool } from 'ai';
import { agentModel } from './model';
import { withActivity, createActivityRecorder } from './activity';
import { createSponsorTools } from './sponsor-tools';
import { createPayPalToolkit } from '@/lib/paypal/toolkit';
import { recordInvoicePayment } from '@/lib/paypal/invoice-payments';
import { parseToolResult } from '@/lib/paypal/results';
import { parsePayPalAmount } from '@/lib/money';
import { startRun, finishRun } from '@/features/runs/service';
import { listOpenInvoices, getSponsor } from '@/features/sponsors/service';
import { MAX_AGENT_STEPS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import type { ToolCallRecord } from '@/db/schema';

const FAILED_SUMMARY = 'Sponsor agent run failed. The error is in the server logs.';

function systemPrompt(sponsorName: string): string {
  return `You are the payments agent for ${sponsorName}, an employer that matches gifts to student loans of people in its cohort. GradPaid's disbursement agent has sent you PayPal invoices for your match. You act for the sponsor, not for GradPaid: pay only what is owed.

For each invoice id you are given: call get_match_evidence. Pay with approve_and_pay only if the cohort matches your rule, billedCents is no more than cohortPledgedCents times ratioBps / 10000, alreadyMatchedCents plus billedCents stays within capCents, and paypalInvoiceCents equals billedCents. Otherwise call decline with a one-sentence reason.

Finish with one plain sentence per invoice saying what you paid or declined and why. No markdown.`;
}

interface InvoiceRead {
  readonly amount?: { readonly value?: string };
}

function invoiceReader(
  tools: Readonly<Record<string, Tool>>,
): (id: string) => Promise<number | undefined> {
  return async (id) => {
    const getInvoice = tools.get_invoice;
    if (!getInvoice?.execute) {
      return undefined;
    }
    const raw = parseToolResult(
      await getInvoice.execute({ invoice_id: id }, { toolCallId: id, messages: [] }),
    ) as InvoiceRead;
    return raw.amount?.value ? parsePayPalAmount(raw.amount.value) : undefined;
  };
}

export interface SponsorRunResult {
  readonly runId: string;
  readonly sponsorId: string;
  readonly summary: string;
  readonly toolCalls: readonly ToolCallRecord[];
}

/** One sponsor agent run per sponsor with open invoices: agent-to-agent settlement over PayPal. */
export async function runSponsorAgents(trigger: string): Promise<readonly SponsorRunResult[]> {
  const open = await listOpenInvoices();
  const sponsorIds = [...new Set(open.map((i) => i.sponsorId))];
  const results: SponsorRunResult[] = [];
  for (const sponsorId of sponsorIds) {
    results.push(
      await runOne(
        sponsorId,
        open.filter((i) => i.sponsorId === sponsorId).map((i) => i.paypalInvoiceId),
        trigger,
      ),
    );
  }
  return results;
}

async function runOne(
  sponsorId: string,
  invoiceIds: readonly string[],
  trigger: string,
): Promise<SponsorRunResult> {
  const sponsor = await getSponsor(sponsorId);
  const run = await startRun(`sponsor:${sponsorId}`, trigger);
  const recorder = createActivityRecorder();
  const paypal = createPayPalToolkit({ invoices: { get: true } }, run.id);
  const tools = withActivity(
    {
      ...createSponsorTools(sponsorId, {
        readInvoiceCents: invoiceReader(paypal.tools),
        recordPayment: (id, cents) => recordInvoicePayment(paypal.toolkit, id, cents),
      }),
      get_invoice: paypal.tools.get_invoice,
    },
    recorder,
  );
  try {
    const result = await generateText({
      model: agentModel(),
      system: systemPrompt(sponsor?.name ?? 'the sponsor'),
      prompt: `Open invoices from GradPaid: ${invoiceIds.join(', ')}.`,
      tools,
      maxSteps: MAX_AGENT_STEPS,
    });
    await finishRun(run.id, 'success', result.text, recorder.records);
    return { runId: run.id, sponsorId, summary: result.text, toolCalls: recorder.records };
  } catch (err) {
    logger.error({ err, runId: run.id }, 'sponsor agent run failed');
    await finishRun(run.id, 'failed', FAILED_SUMMARY, recorder.records);
    return { runId: run.id, sponsorId, summary: FAILED_SUMMARY, toolCalls: recorder.records };
  }
}
