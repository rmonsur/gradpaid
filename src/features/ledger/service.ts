import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { ledgerEntries, reconciliationExceptions, type LedgerEntry } from '@/db/schema';
import { newId } from '@/lib/ids';

export interface AppendLedgerInput {
  readonly kind: LedgerEntry['kind'];
  readonly campaignId?: string;
  readonly amountCents: number;
  readonly counterparty: string;
  readonly paypalRef?: string;
  readonly agentRunId?: string;
  readonly relatedEntryId?: string;
  readonly memo: string;
}

/** Append-only. There is intentionally no update or delete in this module. */
export async function appendLedger(input: AppendLedgerInput): Promise<LedgerEntry> {
  const rows = await getDb()
    .insert(ledgerEntries)
    .values({
      id: newId('led'),
      kind: input.kind,
      campaignId: input.campaignId ?? null,
      amountCents: input.amountCents,
      counterparty: input.counterparty,
      paypalRef: input.paypalRef ?? null,
      agentRunId: input.agentRunId ?? null,
      relatedEntryId: input.relatedEntryId ?? null,
      memo: input.memo,
    })
    .returning();
  return rows[0];
}

export async function listLedger(limit = 500): Promise<readonly LedgerEntry[]> {
  return getDb().select().from(ledgerEntries).orderBy(desc(ledgerEntries.createdAt)).limit(limit);
}

export async function listLedgerForCampaign(campaignId: string): Promise<readonly LedgerEntry[]> {
  return getDb()
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.campaignId, campaignId))
    .orderBy(desc(ledgerEntries.createdAt));
}

export interface ExceptionInput {
  readonly agentRunId: string;
  readonly paypalRef?: string;
  readonly expectedCents?: number;
  readonly actualCents?: number;
  readonly detail: string;
}

export async function recordException(input: ExceptionInput): Promise<void> {
  await getDb()
    .insert(reconciliationExceptions)
    .values({
      id: newId('exc'),
      agentRunId: input.agentRunId,
      paypalRef: input.paypalRef ?? null,
      expectedCents: input.expectedCents ?? null,
      actualCents: input.actualCents ?? null,
      detail: input.detail,
    });
}
