import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { getEnv } from '@/lib/env';
import { listUndisbursedPledges, attachPledgesToDisbursement } from '@/features/giving/service';
import { planDisbursements } from '@/features/disbursement/plan';
import { createDisbursement, markDisbursement } from '@/features/disbursement/service';
import { getCampaign, addDisbursed } from '@/features/campaigns/service';
import { listSponsors, addMatched, recordInvoice } from '@/features/sponsors/service';
import { appendLedger, recordException } from '@/features/ledger/service';
import { computeMatch } from '@/features/matching/match';
import { getDb } from '@/db/client';
import { pledges, campaigns } from '@/db/schema';
import { eq } from 'drizzle-orm';

const LOAN_REF_VISIBLE_DIGITS = 4;

function maskRef(ref: string): string {
  return `****${ref.slice(-LOAN_REF_VISIBLE_DIGITS)}`;
}

/** Local (non-PayPal) tools the disbursement agent uses to read the plan and write the ledger. */
export function createDisbursementLocalTools(agentRunId: string): Readonly<Record<string, Tool>> {
  const env = getEnv();
  return {
    get_disbursement_plan: tool({
      description:
        'Group all captured, not yet disbursed pledges by campaign. Returns one planned payout per campaign with the servicer email and a masked loan reference.',
      parameters: z.object({}),
      execute: async (): Promise<unknown> => {
        const plan = planDisbursements(await listUndisbursedPledges());
        const enriched = await Promise.all(
          plan.map(async (p) => {
            const c = await getCampaign(p.campaignId);
            return {
              ...p,
              campaignTitle: c?.title ?? 'unknown',
              servicerName: c?.servicerName ?? 'unknown',
              servicerEmail: env.PAYPAL_SERVICER_EMAIL,
              loanRefMasked: c ? maskRef(c.loanAccountRef) : '****',
            };
          }),
        );
        return { plan: enriched, servicerEmail: env.PAYPAL_SERVICER_EMAIL };
      },
    }),
    open_disbursement: tool({
      description:
        'Create a disbursement record for a campaign before sending its payout. Returns the disbursement id to use as the payout idempotency key.',
      parameters: z.object({
        campaignId: z.string(),
        amountCents: z.number().int().positive(),
        pledgeIds: z.array(z.string()).min(1),
      }),
      execute: async ({ campaignId, amountCents, pledgeIds }): Promise<unknown> => {
        const d = await createDisbursement(campaignId, amountCents, agentRunId);
        await attachPledgesToDisbursement(pledgeIds, d.id);
        return { disbursementId: d.id };
      },
    }),
    close_disbursement: tool({
      description:
        'Record the result of a payout for a disbursement id and write the ledger entry.',
      parameters: z.object({
        disbursementId: z.string(),
        campaignId: z.string(),
        amountCents: z.number().int().positive(),
        ok: z.boolean(),
        batchId: z.string().optional(),
        itemId: z.string().optional(),
        detail: z.string().optional(),
      }),
      execute: async (input): Promise<unknown> => {
        await markDisbursement(
          input.disbursementId,
          input.ok ? 'sent' : 'failed',
          input.batchId,
          input.itemId,
        );
        if (input.ok) {
          await addDisbursed(input.campaignId, input.amountCents);
        } else {
          await getDb()
            .update(pledges)
            .set({ disbursementId: null })
            .where(eq(pledges.disbursementId, input.disbursementId));
        }
        const c = await getCampaign(input.campaignId);
        await appendLedger({
          kind: input.ok ? 'servicer_payout' : 'exception',
          campaignId: input.campaignId,
          amountCents: input.amountCents,
          counterparty: c?.servicerName ?? 'servicer',
          paypalRef: input.batchId,
          agentRunId,
          memo: input.ok
            ? `Payout to ${c?.servicerName ?? 'servicer'} for loan ${c ? maskRef(c.loanAccountRef) : ''}`
            : `Payout failed: ${input.detail ?? 'unknown'}`,
        });
        return { ok: true };
      },
    }),
    get_sponsor_match_due: tool({
      description:
        'Compute, per sponsor, the match amount now owed from captured pledges on their cohort, net of what was already invoiced.',
      parameters: z.object({}),
      execute: async (): Promise<unknown> => {
        const sponsorsList = await listSponsors();
        const allPledges = await getDb()
          .select({ cents: pledges.cents, tags: campaigns.cohortTags })
          .from(pledges)
          .innerJoin(campaigns, eq(campaigns.id, pledges.campaignId));
        const due = sponsorsList.map((s) => {
          const rule = {
            sponsorId: s.id,
            cohortTag: s.cohortTag,
            ratioBps: s.ratioBps,
            capCents: s.capCents,
            matchedCents: 0,
          };
          const gross = allPledges.reduce(
            (sum, p) => sum + (computeMatch(p.cents, p.tags, [rule])[0]?.matchCents ?? 0),
            0,
          );
          const capped = Math.min(gross, s.capCents);
          return {
            sponsorId: s.id,
            sponsorName: s.name,
            sponsorEmail: env.PAYPAL_SPONSOR_EMAIL,
            cohortTag: s.cohortTag,
            dueCents: Math.max(0, capped - s.matchedCents),
          };
        });
        return { due: due.filter((d) => d.dueCents > 0) };
      },
    }),
    record_sponsor_invoice: tool({
      description: 'Record a sent PayPal invoice for a sponsor match and write the ledger entry.',
      parameters: z.object({
        sponsorId: z.string(),
        paypalInvoiceId: z.string(),
        amountCents: z.number().int().positive(),
      }),
      execute: async (input): Promise<unknown> => {
        await recordInvoice({ ...input, status: 'sent' });
        await addMatched(input.sponsorId, input.amountCents);
        await appendLedger({
          kind: 'sponsor_invoiced',
          amountCents: input.amountCents,
          counterparty: input.sponsorId,
          paypalRef: input.paypalInvoiceId,
          agentRunId,
          memo: 'Sponsor match invoiced',
        });
        return { ok: true };
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
