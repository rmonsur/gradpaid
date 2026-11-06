import { and, eq, sql } from 'drizzle-orm';
import { appendLedger } from '@/features/ledger/service';
import { getDb } from '@/db/client';
import { sponsors, invoices, pledges, campaigns, type Sponsor, type Invoice } from '@/db/schema';
import { newId } from '@/lib/ids';
import { computeMatch, type MatchRule } from '@/features/matching/match';

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

/** Records a sent invoice and advances the sponsor's matched total by the same amount. */
export async function recordInvoice(input: RecordInvoiceInput): Promise<Invoice> {
  const rows = await getDb()
    .insert(invoices)
    .values({ id: newId('inv'), ...input })
    .returning();
  await addMatched(input.sponsorId, input.amountCents);
  return rows[0];
}

export async function listInvoices(): Promise<readonly Invoice[]> {
  return getDb().select().from(invoices);
}

export interface SponsorMatchDue {
  readonly sponsorId: string;
  readonly sponsorName: string;
  readonly cohortTag: string;
  readonly dueCents: number;
}

/**
 * Per sponsor, the match owed from every captured pledge on their cohort, limited by the
 * sponsor cap and net of what has already been invoiced. Includes sponsors owed nothing.
 */
export async function listSponsorMatchDue(): Promise<readonly SponsorMatchDue[]> {
  const sponsorRows = await listSponsors();
  const cohortPledges = await getDb()
    .select({ cents: pledges.cents, tags: campaigns.cohortTags })
    .from(pledges)
    .innerJoin(campaigns, eq(campaigns.id, pledges.campaignId));
  return sponsorRows.map((s) => {
    const rule: MatchRule = {
      sponsorId: s.id,
      cohortTag: s.cohortTag,
      ratioBps: s.ratioBps,
      capCents: s.capCents,
      matchedCents: 0,
    };
    const gross = cohortPledges.reduce(
      (sum, p) => sum + (computeMatch(p.cents, p.tags, [rule])[0]?.matchCents ?? 0),
      0,
    );
    return {
      sponsorId: s.id,
      sponsorName: s.name,
      cohortTag: s.cohortTag,
      dueCents: Math.max(0, Math.min(gross, s.capCents) - s.matchedCents),
    };
  });
}

/**
 * Settles a sponsor match invoice exactly once: a conditional sent-to-paid update, so the PayPal
 * webhook and the sponsor agent can both call it and only one writes the sponsor_paid row.
 */
export async function markInvoicePaid(paypalInvoiceId: string): Promise<boolean> {
  const rows = await getDb()
    .update(invoices)
    .set({ status: 'paid' })
    .where(and(eq(invoices.paypalInvoiceId, paypalInvoiceId), eq(invoices.status, 'sent')))
    .returning();
  const invoice = rows[0];
  if (!invoice) {
    return false;
  }
  const sponsor = await getSponsor(invoice.sponsorId);
  await appendLedger({
    kind: 'sponsor_paid',
    amountCents: invoice.amountCents,
    counterparty: sponsor?.name ?? invoice.sponsorId,
    paypalRef: paypalInvoiceId,
    memo: 'Sponsor match paid on its PayPal invoice',
  });
  return true;
}

export async function getInvoiceByPayPalId(paypalInvoiceId: string): Promise<Invoice | undefined> {
  const rows = await getDb()
    .select()
    .from(invoices)
    .where(eq(invoices.paypalInvoiceId, paypalInvoiceId))
    .limit(1);
  return rows[0];
}

export async function listOpenInvoices(): Promise<readonly Invoice[]> {
  return getDb().select().from(invoices).where(eq(invoices.status, 'sent'));
}

/** Cents pledged to campaigns tagged with a cohort, the base a sponsor's match is computed on. */
export async function cohortPledgedCents(cohortTag: string): Promise<number> {
  const rows = await getDb()
    .select({ total: sql<number>`coalesce(sum(${pledges.cents}), 0)::int` })
    .from(pledges)
    .innerJoin(campaigns, eq(campaigns.id, pledges.campaignId))
    .where(sql`${cohortTag} = any(${campaigns.cohortTags})`);
  return rows[0]?.total ?? 0;
}
