import { eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { orders, pledges, type Order, type Pledge, type SplitLine } from '@/db/schema';
import { newId } from '@/lib/ids';
import { addRaised } from '@/features/campaigns/service';
import { appendLedger } from '@/features/ledger/service';

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
 * Marks an order captured and creates one pledge per split line. Idempotent: a second
 * call for an already captured order is a no-op so webhook plus polling cannot double count.
 */
export async function markCaptured(
  paypalOrderId: string,
  captureId: string,
  agentRunId?: string,
): Promise<Order | undefined> {
  const db = getDb();
  const existing = await getOrderByPayPalId(paypalOrderId);
  if (!existing || existing.status === 'captured') {
    return existing;
  }
  const updated = await db
    .update(orders)
    .set({ status: 'captured', paypalCaptureId: captureId, capturedAt: new Date() })
    .where(eq(orders.id, existing.id))
    .returning();
  for (const line of existing.split) {
    await db.insert(pledges).values({
      id: newId('plg'),
      orderId: existing.id,
      campaignId: line.campaignId,
      cents: line.cents,
    });
    await addRaised(line.campaignId, line.cents);
    await appendLedger({
      kind: 'donation_captured',
      campaignId: line.campaignId,
      amountCents: line.cents,
      counterparty: existing.donorName,
      paypalRef: captureId,
      agentRunId,
      memo: `Donation captured for campaign ${line.campaignId}`,
    });
  }
  return updated[0];
}

export async function listUndisbursedPledges(): Promise<readonly Pledge[]> {
  return getDb().select().from(pledges).where(isNull(pledges.disbursementId));
}

export async function attachPledgesToDisbursement(
  pledgeIds: readonly string[],
  disbursementId: string,
): Promise<void> {
  for (const id of pledgeIds) {
    await getDb().update(pledges).set({ disbursementId }).where(eq(pledges.id, id));
  }
}

export async function listOrders(): Promise<readonly Order[]> {
  return getDb().select().from(orders);
}
