import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { disbursements, pledges, type Disbursement, type Pledge } from '@/db/schema';
import { newId } from '@/lib/ids';
import { MIN_DISBURSEMENT_CENTS } from '@/lib/constants';
import { addDisbursed, getCampaign } from '@/features/campaigns/service';
import { appendLedger } from '@/features/ledger/service';
import { maskLoanRef } from '@/lib/mask';
import type { PayoutResult } from '@/lib/paypal/payouts';

/** A disbursement the agent may pay: either freshly planned or failed with its pledges still held. */
export interface PayableDisbursement {
  readonly id: string;
  readonly campaignId: string;
  readonly amountCents: number;
  readonly pledgeIds: readonly string[];
}

/** Prefix of the synthetic ids a dry run hands out instead of creating rows. */
export const DRY_RUN_PREFIX = 'dry_';

const PAYABLE_STATUSES: readonly Disbursement['status'][] = ['planned', 'failed'];

function sumCents(rows: readonly Pledge[]): number {
  return rows.reduce((total, p) => total + p.cents, 0);
}

async function attachedPledges(disbursementId: string): Promise<readonly Pledge[]> {
  return getDb().select().from(pledges).where(eq(pledges.disbursementId, disbursementId));
}

/**
 * Failed disbursements whose pledges are still attached. They are resumed under the same id so
 * the PayPal idempotency key is reused and a payout that did go through is never repeated.
 */
export async function listResumableDisbursements(): Promise<readonly PayableDisbursement[]> {
  const failed = await getDb()
    .select()
    .from(disbursements)
    .where(eq(disbursements.status, 'failed'))
    .orderBy(desc(disbursements.createdAt));
  const resumable = await Promise.all(
    failed.map(async (d) => {
      const held = await attachedPledges(d.id);
      return held.length > 0
        ? [
            {
              id: d.id,
              campaignId: d.campaignId,
              amountCents: sumCents(held),
              pledgeIds: held.map((p) => p.id),
            },
          ]
        : [];
    }),
  );
  return resumable.flat();
}

/**
 * Opens (or resumes) the disbursement for a campaign. The amount is computed on the server from
 * the campaign's undisbursed pledges; the model never supplies it.
 */
export async function openDisbursementForCampaign(
  campaignId: string,
  agentRunId: string,
): Promise<PayableDisbursement | { readonly error: string }> {
  const resumable = (await listResumableDisbursements()).find((d) => d.campaignId === campaignId);
  if (resumable) {
    return resumable;
  }
  const db = getDb();
  const free = await db
    .select()
    .from(pledges)
    .where(and(eq(pledges.campaignId, campaignId), isNull(pledges.disbursementId)));
  const amountCents = sumCents(free);
  if (amountCents < MIN_DISBURSEMENT_CENTS) {
    return { error: 'nothing to disburse for this campaign' };
  }
  const id = newId('dsb');
  await db.insert(disbursements).values({ id, campaignId, amountCents, agentRunId });
  await db
    .update(pledges)
    .set({ disbursementId: id })
    .where(
      inArray(
        pledges.id,
        free.map((p) => p.id),
      ),
    );
  return { id, campaignId, amountCents, pledgeIds: free.map((p) => p.id) };
}

export interface PayoutOrder {
  readonly id: string;
  readonly amountCents: number;
  readonly note: string;
}

/** What the payout tool is allowed to send for a disbursement id, or undefined if not payable. */
export async function resolvePayoutOrder(disbursementId: string): Promise<PayoutOrder | undefined> {
  const rows = await getDb()
    .select()
    .from(disbursements)
    .where(eq(disbursements.id, disbursementId))
    .limit(1);
  const d = rows[0];
  if (!d || !PAYABLE_STATUSES.includes(d.status)) {
    return undefined;
  }
  const held = await attachedPledges(d.id);
  const amountCents = sumCents(held);
  if (amountCents <= 0) {
    return undefined;
  }
  const campaign = await getCampaign(d.campaignId);
  const ref = campaign ? maskLoanRef(campaign.loanAccountRef) : '';
  return { id: d.id, amountCents, note: `GradPaid payment toward loan ${ref}` };
}

/** Dry-run counterpart of resolvePayoutOrder: computes from pledges, creates nothing. */
export async function resolveDryRunPayout(
  disbursementId: string,
): Promise<PayoutOrder | undefined> {
  if (!disbursementId.startsWith(DRY_RUN_PREFIX)) {
    return undefined;
  }
  const campaignId = disbursementId.slice(DRY_RUN_PREFIX.length);
  const free = await getDb()
    .select()
    .from(pledges)
    .where(and(eq(pledges.campaignId, campaignId), isNull(pledges.disbursementId)));
  const amountCents = sumCents(free);
  if (amountCents <= 0) {
    return undefined;
  }
  const campaign = await getCampaign(campaignId);
  const ref = campaign ? maskLoanRef(campaign.loanAccountRef) : '';
  return { id: disbursementId, amountCents, note: `GradPaid payment toward loan ${ref}` };
}

/** Total already sent in this run, read from the rows rather than an in-memory counter. */
export async function spentCentsForRun(agentRunId: string): Promise<number> {
  const rows = await getDb()
    .select({ total: sql<number>`coalesce(sum(${disbursements.amountCents}), 0)::int` })
    .from(disbursements)
    .where(
      and(
        eq(disbursements.agentRunId, agentRunId),
        inArray(disbursements.status, ['sent', 'success']),
      ),
    );
  return rows[0]?.total ?? 0;
}

/** Marks a payout sent, credits the campaign and writes the ledger row, all server-side. */
export async function recordPayoutSent(
  disbursementId: string,
  result: PayoutResult,
  agentRunId?: string,
): Promise<void> {
  const order = await resolvePayoutOrder(disbursementId);
  if (!order) {
    return;
  }
  const rows = await getDb()
    .update(disbursements)
    .set({
      status: 'sent',
      paypalPayoutBatchId: result.batchId,
      paypalPayoutItemId: result.itemId ?? null,
    })
    .where(eq(disbursements.id, disbursementId))
    .returning();
  const d = rows[0];
  const campaign = await getCampaign(d.campaignId);
  await addDisbursed(d.campaignId, order.amountCents);
  await appendLedger({
    kind: 'servicer_payout',
    campaignId: d.campaignId,
    amountCents: order.amountCents,
    counterparty: campaign?.servicerName ?? 'servicer',
    paypalRef: result.batchId,
    agentRunId: agentRunId ?? d.agentRunId ?? undefined,
    memo: `Payout to ${campaign?.servicerName ?? 'servicer'} for loan ${campaign ? maskLoanRef(campaign.loanAccountRef) : ''}`,
  });
}

/** Marks a payout failed. Pledges stay attached so the next run resumes under the same id. */
export async function recordPayoutFailed(
  disbursementId: string,
  detail: string,
  agentRunId?: string,
): Promise<void> {
  const rows = await getDb()
    .update(disbursements)
    .set({ status: 'failed' })
    .where(eq(disbursements.id, disbursementId))
    .returning();
  const d = rows[0];
  if (!d) {
    return;
  }
  await appendLedger({
    kind: 'exception',
    campaignId: d.campaignId,
    amountCents: d.amountCents,
    counterparty: 'PayPal Payouts',
    agentRunId: agentRunId ?? d.agentRunId ?? undefined,
    memo: `Payout failed: ${detail}`,
  });
}

/** Records the batch status PayPal reports so the ledger shows settlement, not just submission. */
export async function recordPayoutBatchStatus(batchId: string, batchStatus: string): Promise<void> {
  const settled = batchStatus === 'SUCCESS';
  const failed = batchStatus === 'DENIED' || batchStatus === 'CANCELED';
  if (!settled && !failed) {
    return;
  }
  await getDb()
    .update(disbursements)
    .set({ status: settled ? 'success' : 'failed' })
    .where(and(eq(disbursements.paypalPayoutBatchId, batchId), eq(disbursements.status, 'sent')));
}

/**
 * Releases pledges held by disbursements this run opened but never paid, so a crashed run
 * cannot strand donations. Rows that reached a payout attempt are left alone.
 */
export async function releasePlannedDisbursements(agentRunId: string): Promise<number> {
  const db = getDb();
  const stale = await db
    .select({ id: disbursements.id })
    .from(disbursements)
    .where(and(eq(disbursements.agentRunId, agentRunId), eq(disbursements.status, 'planned')));
  if (stale.length === 0) {
    return 0;
  }
  const ids = stale.map((s) => s.id);
  await db
    .update(pledges)
    .set({ disbursementId: null })
    .where(inArray(pledges.disbursementId, ids));
  await db.update(disbursements).set({ status: 'failed' }).where(inArray(disbursements.id, ids));
  return ids.length;
}

export async function listDisbursements(): Promise<readonly Disbursement[]> {
  return getDb().select().from(disbursements).orderBy(desc(disbursements.createdAt));
}
