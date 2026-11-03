import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { sponsors, invoices, type Sponsor, type Invoice } from '@/db/schema';
import { newId } from '@/lib/ids';
import type { MatchRule } from '@/features/matching/match';

export async function listSponsors(): Promise<readonly Sponsor[]> {
  return getDb().select().from(sponsors);
}

export async function listMatchRules(): Promise<readonly MatchRule[]> {
  const rows = await listSponsors();
  return rows.map((s) => ({
    sponsorId: s.id,
    cohortTag: s.cohortTag,
    ratioBps: s.ratioBps,
    capCents: s.capCents,
    matchedCents: s.matchedCents,
  }));
}

export async function getSponsor(id: string): Promise<Sponsor | undefined> {
  const rows = await getDb().select().from(sponsors).where(eq(sponsors.id, id)).limit(1);
  return rows[0];
}

export async function addMatched(sponsorId: string, cents: number): Promise<void> {
  await getDb()
    .update(sponsors)
    .set({ matchedCents: sql`${sponsors.matchedCents} + ${cents}` })
    .where(eq(sponsors.id, sponsorId));
}

export interface RecordInvoiceInput {
  readonly sponsorId: string;
  readonly paypalInvoiceId: string;
  readonly amountCents: number;
  readonly status: Invoice['status'];
}

export async function recordInvoice(input: RecordInvoiceInput): Promise<Invoice> {
  const rows = await getDb()
    .insert(invoices)
    .values({ id: newId('inv'), ...input })
    .returning();
  return rows[0];
}

export async function listInvoices(): Promise<readonly Invoice[]> {
  return getDb().select().from(invoices);
}
