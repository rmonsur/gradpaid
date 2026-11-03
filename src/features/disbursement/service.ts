import { eq, desc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { disbursements, type Disbursement } from '@/db/schema';
import { newId } from '@/lib/ids';

export async function createDisbursement(
  campaignId: string,
  amountCents: number,
  agentRunId: string,
): Promise<Disbursement> {
  const rows = await getDb()
    .insert(disbursements)
    .values({ id: newId('dsb'), campaignId, amountCents, agentRunId })
    .returning();
  return rows[0];
}

export async function markDisbursement(
  id: string,
  status: Disbursement['status'],
  batchId?: string,
  itemId?: string,
): Promise<void> {
  await getDb()
    .update(disbursements)
    .set({
      status,
      paypalPayoutBatchId: batchId ?? null,
      paypalPayoutItemId: itemId ?? null,
    })
    .where(eq(disbursements.id, id));
}

export async function listDisbursements(): Promise<readonly Disbursement[]> {
  return getDb().select().from(disbursements).orderBy(desc(disbursements.createdAt));
}
