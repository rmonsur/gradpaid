import { and, eq, gte, isNull, ne } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { orders, pledges, type Order, type Pledge, type SplitLine } from '@/db/schema';
import { newId } from '@/lib/ids';
import { addRaised } from '@/features/campaigns/service';
import { appendLedger } from '@/features/ledger/service';

/** PayPal refs with this prefix were seeded by the demo reset, not captured by PayPal. */
export const SEED_REF_PREFIX = 'SEED-';

export interface RecordOrderInput {
  readonly paypalOrderId: string;
  readonly donorName: string;
  readonly donorEmail?: string;
  readonly totalCents: number;
  readonly split: readonly SplitLine[];
}

export async function recordOrder(input: RecordOrderInput): Promise<Order> {
  const sum = input.split.reduce((s, l) => s + l.cents, 0);
  if (sum !== input.totalCents) {
    throw new Error(`Split total ${sum} does not equal order total ${input.totalCents}`);
  }
  const rows = await getDb()
    .insert(orders)
    .values({ id: newId('ord'), ...input, donorEmail: input.donorEmail ?? null })
    .returning();
  return rows[0];
}

export async function getOrderByPayPalId(paypalOrderId: string): Promise<Order | undefined> {
  const rows = await getDb()
    .select()
    .from(orders)
    .where(eq(orders.paypalOrderId, paypalOrderId))
    .limit(1);
  return rows[0];
}

/**
 * Marks an order captured and creates one pledge per split line. The status flip is a single
 * conditional UPDATE, so when the webhook and the polling route race only one caller gets the
 * row back and writes pledges; the other sees the already captured order.
 */
export async function markCaptured(
  paypalOrderId: string,
  captureId: string,
  agentRunId?: string,
): Promise<Order | undefined> {
  const db = getDb();
  const updated = await db
    .update(orders)
    .set({ status: 'captured', paypalCaptureId: captureId, capturedAt: new Date() })
    .where(and(eq(orders.paypalOrderId, paypalOrderId), ne(orders.status, 'captured')))
    .returning();
  const won = updated[0];
  if (!won) {
    return getOrderByPayPalId(paypalOrderId);
  }
  for (const line of won.split) {
    await db.insert(pledges).values({
      id: newId('plg'),
      orderId: won.id,
      campaignId: line.campaignId,
      cents: line.cents,
    });
    await addRaised(line.campaignId, line.cents);
    await appendLedger({
      kind: 'donation_captured',
      campaignId: line.campaignId,
      amountCents: line.cents,
      counterparty: won.donorName,
      paypalRef: captureId,
      agentRunId,
      memo: `Donation captured for campaign ${line.campaignId}`,
    });
  }
  return won;
}

export interface CapturedOrderSummary {
  readonly paypalOrderId: string;
  readonly paypalRef: string;
  readonly amountCents: number;
  readonly capturedAt: Date;
}

/** Captured orders since a date, excluding seeded demo gifts that have no PayPal counterpart. */
export async function listCapturedOrdersSince(
  since: Date,
): Promise<readonly CapturedOrderSummary[]> {
  const rows = await getDb()
    .select()
    .from(orders)
    .where(and(eq(orders.status, 'captured'), gte(orders.capturedAt, since)));
  return rows.flatMap((o) =>
    o.paypalCaptureId && o.capturedAt && !o.paypalCaptureId.startsWith(SEED_REF_PREFIX)
      ? [
          {
            paypalOrderId: o.paypalOrderId,
            paypalRef: o.paypalCaptureId,
            amountCents: o.totalCents,
            capturedAt: o.capturedAt,
          },
        ]
      : [],
  );
}

export async function listUndisbursedPledges(): Promise<readonly Pledge[]> {
  return getDb().select().from(pledges).where(isNull(pledges.disbursementId));
}

export async function listOrders(): Promise<readonly Order[]> {
  return getDb().select().from(orders);
}
