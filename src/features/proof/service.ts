import { eq, inArray, or } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { campaigns, disbursements, orders, pledges, type Order } from '@/db/schema';
import { maskLoanRef } from '@/lib/mask';

export type LegStatus = 'waiting' | 'planned' | 'sent' | 'success' | 'failed';

export interface ProofLeg {
  readonly campaignId: string;
  readonly campaignTitle: string;
  readonly servicerName: string;
  readonly loanRefMasked: string;
  readonly cents: number;
  readonly disbursementId: string | null;
  readonly payoutBatchId: string | null;
  readonly payoutStatus: LegStatus;
}

export interface ProofTrace {
  readonly donation: {
    readonly paypalOrderId: string;
    readonly paypalCaptureId: string | null;
    readonly donorName: string;
    readonly totalCents: number;
    readonly capturedAt: Date | null;
  };
  readonly legs: readonly ProofLeg[];
}

async function findOrder(ref: string): Promise<Order | undefined> {
  const db = getDb();
  const direct = await db
    .select()
    .from(orders)
    .where(or(eq(orders.paypalOrderId, ref), eq(orders.paypalCaptureId, ref)))
    .limit(1);
  if (direct[0]) {
    return direct[0];
  }
  const viaPayout = await db
    .select({ orderId: pledges.orderId })
    .from(pledges)
    .innerJoin(disbursements, eq(disbursements.id, pledges.disbursementId))
    .where(eq(disbursements.paypalPayoutBatchId, ref))
    .limit(1);
  if (!viaPayout[0]) {
    return undefined;
  }
  const rows = await db.select().from(orders).where(eq(orders.id, viaPayout[0].orderId)).limit(1);
  return rows[0];
}

/**
 * Follows any PayPal reference (order id, capture id or payout batch id) to the donation and to
 * every campaign leg it funded, with the payout that paid each leg. Public: loan refs are masked.
 */
export async function traceByPayPalRef(ref: string): Promise<ProofTrace | undefined> {
  const order = await findOrder(ref);
  if (!order) {
    return undefined;
  }
  const db = getDb();
  const legRows = await db
    .select({ pledge: pledges, campaign: campaigns, disbursement: disbursements })
    .from(pledges)
    .innerJoin(campaigns, eq(campaigns.id, pledges.campaignId))
    .leftJoin(disbursements, eq(disbursements.id, pledges.disbursementId))
    .where(eq(pledges.orderId, order.id));
  const orderOfSplit = order.split.map((s) => s.campaignId);
  const legs = legRows
    .map((r): ProofLeg => ({
      campaignId: r.campaign.id,
      campaignTitle: r.campaign.title,
      servicerName: r.campaign.servicerName,
      loanRefMasked: maskLoanRef(r.campaign.loanAccountRef),
      cents: r.pledge.cents,
      disbursementId: r.disbursement?.id ?? null,
      payoutBatchId: r.disbursement?.paypalPayoutBatchId ?? null,
      payoutStatus: r.disbursement?.status ?? 'waiting',
    }))
    .sort((a, b) => orderOfSplit.indexOf(a.campaignId) - orderOfSplit.indexOf(b.campaignId));
  return {
    donation: {
      paypalOrderId: order.paypalOrderId,
      paypalCaptureId: order.paypalCaptureId,
      donorName: order.donorName,
      totalCents: order.totalCents,
      capturedAt: order.capturedAt,
    },
    legs,
  };
}

/** Recent captured donations, newest first, so the proof page has something to click. */
export async function listRecentProofRefs(limit: number): Promise<readonly string[]> {
  const rows = await getDb()
    .select({ ref: orders.paypalCaptureId, status: orders.status })
    .from(orders)
    .where(inArray(orders.status, ['captured']))
    .limit(limit);
  return rows.flatMap((r) => (r.ref ? [r.ref] : []));
}
