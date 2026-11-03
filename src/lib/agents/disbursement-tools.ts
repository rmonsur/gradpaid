import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { getEnv } from '@/lib/env';
import { listUndisbursedPledges, listCapturedOrdersSince } from '@/features/giving/service';
import { planDisbursements } from '@/features/disbursement/plan';
import {
  DRY_RUN_PREFIX,
  listResumableDisbursements,
  openDisbursementForCampaign,
} from '@/features/disbursement/service';
import { getCampaign } from '@/features/campaigns/service';
import { listSponsorMatchDue, recordInvoice } from '@/features/sponsors/service';
import { appendLedger, recordException } from '@/features/ledger/service';
import { maskLoanRef } from '@/lib/mask';

const DEFAULT_RECONCILE_DAYS = 7;
const MAX_RECONCILE_DAYS = 31;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Server-side checks the tools need that live outside this module (PayPal reads). */
export interface DisbursementToolDeps {
  /** Reads the invoice back from PayPal and returns its total in cents, or undefined if unknown. */
  readonly verifyInvoiceCents: (paypalInvoiceId: string) => Promise<number | undefined>;
}

interface PlanEntry {
  readonly campaignId: string;
  readonly amountCents: number;
  readonly pledgeIds: readonly string[];
  readonly resumeDisbursementId?: string;
}

async function enrich(entry: PlanEntry, servicerEmail: string): Promise<Record<string, unknown>> {
  const c = await getCampaign(entry.campaignId);
  return {
    ...entry,
    campaignTitle: c?.title ?? 'unknown',
    servicerName: c?.servicerName ?? 'unknown',
    servicerEmail,
    loanRefMasked: c ? maskLoanRef(c.loanAccountRef) : '****',
  };
}

/** Local (non-PayPal) tools the disbursement agent uses to read the plan and write the ledger. */
export function createDisbursementLocalTools(
  agentRunId: string,
  dryRun: boolean,
  deps: DisbursementToolDeps,
): Readonly<Record<string, Tool>> {
  const env = getEnv();
  const simulated = { simulated: true, dryRun: true };
  return {
    get_disbursement_plan: tool({
      description:
        'Group all captured, not yet disbursed pledges by campaign, plus any failed payout to resume. Returns one planned payout per campaign with the servicer email and a masked loan reference.',
      parameters: z.object({}),
      execute: async (): Promise<unknown> => {
        const resumable = await listResumableDisbursements();
        const fresh = planDisbursements(await listUndisbursedPledges());
        const entries: readonly PlanEntry[] = [
          ...resumable.map((r) => ({ ...r, resumeDisbursementId: r.id })),
          ...fresh,
        ];
        const plan = await Promise.all(entries.map((e) => enrich(e, env.PAYPAL_SERVICER_EMAIL)));
        return { plan, servicerEmail: env.PAYPAL_SERVICER_EMAIL };
      },
    }),
    open_disbursement: tool({
      description:
        'Open (or resume) the disbursement for a campaign. The server computes the amount from its pledges and returns the disbursement id to pass to send_payout.',
      parameters: z.object({ campaignId: z.string() }),
      execute: async ({ campaignId }): Promise<unknown> => {
        if (dryRun) {
          const free = (await listUndisbursedPledges()).filter((p) => p.campaignId === campaignId);
          const amountCents = free.reduce((total, p) => total + p.cents, 0);
          return { disbursementId: `${DRY_RUN_PREFIX}${campaignId}`, amountCents, ...simulated };
        }
        const opened = await openDisbursementForCampaign(campaignId, agentRunId);
        if ('error' in opened) {
          return opened;
        }
        return { disbursementId: opened.id, amountCents: opened.amountCents };
      },
    }),
    get_sponsor_match_due: tool({
      description:
        'Compute, per sponsor, the match amount now owed from captured pledges on their cohort, net of what was already invoiced.',
      parameters: z.object({}),
      execute: async (): Promise<unknown> => {
        const due = await listSponsorMatchDue();
        return {
          due: due
            .filter((d) => d.dueCents > 0)
            .map((d) => ({ ...d, sponsorEmail: env.PAYPAL_SPONSOR_EMAIL })),
        };
      },
    }),
    record_sponsor_invoice: tool({
      description:
        'Record a sent PayPal invoice for a sponsor match. The server verifies the invoice total against the amount due before writing the ledger entry.',
      parameters: z.object({ sponsorId: z.string(), paypalInvoiceId: z.string() }),
      execute: async ({ sponsorId, paypalInvoiceId }): Promise<unknown> => {
        const due = (await listSponsorMatchDue()).find((d) => d.sponsorId === sponsorId);
        if (!due || due.dueCents <= 0) {
          return { error: 'nothing is due for this sponsor' };
        }
        if (dryRun) {
          return { ok: true, amountCents: due.dueCents, ...simulated };
        }
        const invoiced = await deps.verifyInvoiceCents(paypalInvoiceId);
        if (invoiced !== undefined && invoiced !== due.dueCents) {
          return {
            error: `invoice amount ${invoiced} cents does not match the ${due.dueCents} cents due`,
          };
        }
        await recordInvoice({
          sponsorId,
          paypalInvoiceId,
          amountCents: due.dueCents,
          status: 'sent',
        });
        await appendLedger({
          kind: 'sponsor_invoiced',
          amountCents: due.dueCents,
          counterparty: due.sponsorName,
          paypalRef: paypalInvoiceId,
          agentRunId,
          memo: `Sponsor match invoiced for cohort ${due.cohortTag}`,
        });
        return { ok: true, amountCents: due.dueCents };
      },
    }),
    get_ledger_expectations: tool({
      description:
        'List the donation captures the ledger expects to see in PayPal transaction history for the last N days. Compare these against list_transactions.',
      parameters: z.object({
        days: z.number().int().min(1).max(MAX_RECONCILE_DAYS).default(DEFAULT_RECONCILE_DAYS),
      }),
      execute: async ({ days }): Promise<unknown> => {
        const since = new Date(Date.now() - days * MS_PER_DAY);
        const expectations = await listCapturedOrdersSince(since);
        return { since: since.toISOString(), expectations };
      },
    }),
    record_reconciliation: tool({
      description:
        'Write the reconciliation outcome for this run. Call once at the end with any mismatches.',
      parameters: z.object({
        checkedCount: z.number().int().nonnegative(),
        mismatches: z.array(
          z.object({
            paypalRef: z.string().optional(),
            expectedCents: z.number().int().optional(),
            actualCents: z.number().int().optional(),
            detail: z.string(),
          }),
        ),
      }),
      execute: async ({ checkedCount, mismatches }): Promise<unknown> => {
        if (dryRun) {
          return { ok: true, ...simulated, checkedCount, mismatches };
        }
        for (const m of mismatches) {
          await recordException({ agentRunId, ...m });
        }
        await appendLedger({
          kind: 'reconciled',
          amountCents: 0,
          counterparty: 'PayPal',
          agentRunId,
          memo: `Reconciled ${checkedCount} transactions, ${mismatches.length} exceptions`,
        });
        return { ok: true };
      },
    }),
  };
}
