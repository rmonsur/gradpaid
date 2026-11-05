import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { campaigns, borrowers, type Campaign, type NewCampaign } from '@/db/schema';
import { newId } from '@/lib/ids';
import { prepaymentImpact, type PrepaymentImpact } from './impact';

/** Words shorter than this are ignored by the Postgres fallback search. */
const MIN_SEARCH_TERM_CHARS = 3;
/** The gift size quoted on campaign cards. */
export const SAMPLE_GIFT_CENTS = 5_000;

export interface CampaignSummary {
  readonly id: string;
  readonly title: string;
  readonly story: string;
  readonly school: string;
  readonly fieldOfStudy: string;
  readonly state: string;
  readonly cohortTags: readonly string[];
  readonly servicerName: string;
  readonly goalCents: number;
  readonly raisedCents: number;
  readonly disbursedCents: number;
  readonly remainingCents: number;
  readonly status: Campaign['status'];
  /** What a $50 gift does to this loan: interest no longer owed and days sooner paid off. */
  readonly impactOfFifty: PrepaymentImpact;
}

export function toSummary(c: Campaign): CampaignSummary {
  return {
    id: c.id,
    title: c.title,
    story: c.story,
    school: c.school,
    fieldOfStudy: c.fieldOfStudy,
    state: c.state,
    cohortTags: c.cohortTags,
    servicerName: c.servicerName,
    goalCents: c.goalCents,
    raisedCents: c.raisedCents,
    disbursedCents: c.disbursedCents,
    remainingCents: Math.max(0, c.goalCents - c.raisedCents),
    status: c.status,
    impactOfFifty: prepaymentImpact(c, SAMPLE_GIFT_CENTS),
  };
}

export async function listActiveCampaigns(): Promise<readonly CampaignSummary[]> {
  const rows = await getDb()
    .select()
    .from(campaigns)
    .where(eq(campaigns.status, 'active'))
    .orderBy(desc(campaigns.createdAt));
  return rows.map(toSummary);
}

export async function listAllCampaigns(): Promise<readonly Campaign[]> {
  return getDb().select().from(campaigns).orderBy(desc(campaigns.createdAt));
}

export async function getCampaign(id: string): Promise<Campaign | undefined> {
  const rows = await getDb().select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return rows[0];
}

export async function getCampaignsByIds(ids: readonly string[]): Promise<readonly Campaign[]> {
  if (ids.length === 0) {
    return [];
  }
  return getDb()
    .select()
    .from(campaigns)
    .where(inArray(campaigns.id, [...ids]));
}

export interface CreateCampaignInput {
  readonly borrower: { readonly displayName: string; readonly email: string };
  readonly campaign: Omit<NewCampaign, 'id' | 'borrowerId' | 'createdAt'>;
}

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const db = getDb();
  const borrowerId = newId('bor');
  const campaignId = newId('cmp');
  await db.insert(borrowers).values({ id: borrowerId, ...input.borrower });
  const rows = await db
    .insert(campaigns)
    .values({ ...input.campaign, id: campaignId, borrowerId })
    .returning();
  return rows[0];
}

export async function addRaised(campaignId: string, cents: number): Promise<void> {
  await getDb()
    .update(campaigns)
    .set({
      raisedCents: sql`${campaigns.raisedCents} + ${cents}`,
      status: sql`case when ${campaigns.raisedCents} + ${cents} >= ${campaigns.goalCents} then 'funded'::campaign_status else ${campaigns.status} end`,
    })
    .where(eq(campaigns.id, campaignId));
}

export async function addDisbursed(campaignId: string, cents: number): Promise<void> {
  await getDb()
    .update(campaigns)
    .set({ disbursedCents: sql`${campaigns.disbursedCents} + ${cents}` })
    .where(eq(campaigns.id, campaignId));
}

/** Postgres fallback search used when Elastic is not configured. */
export async function searchCampaignsInPostgres(
  query: string,
  limit: number,
): Promise<readonly CampaignSummary[]> {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= MIN_SEARCH_TERM_CHARS);
  const haystack = sql`lower(${campaigns.title} || ' ' || ${campaigns.story} || ' ' || ${campaigns.school} || ' ' || ${campaigns.fieldOfStudy} || ' ' || ${campaigns.state} || ' ' || array_to_string(${campaigns.cohortTags}, ' '))`;
  const score = sql.join(
    terms.map((t) => sql`(case when ${haystack} like ${`%${t}%`} then 1 else 0 end)`),
    sql` + `,
  );
  const hasTerms = terms.length > 0;
  const ordering = hasTerms
    ? [desc(score), desc(campaigns.createdAt)]
    : [desc(campaigns.createdAt)];
  const rows = await getDb()
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.status, 'active'), hasTerms ? sql`${score} > 0` : undefined))
    .orderBy(...ordering)
    .limit(limit);
  return rows.map(toSummary);
}
