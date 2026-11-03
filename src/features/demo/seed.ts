import { getDb } from '@/db/client';
import {
  borrowers,
  campaigns,
  sponsors,
  orders,
  pledges,
  invoices,
  disbursements,
  ledgerEntries,
  agentRuns,
  reconciliationExceptions,
} from '@/db/schema';
import { newId } from '@/lib/ids';
import { ensureCampaignIndex, indexCampaign } from '@/features/search/service';
import { markCaptured, recordOrder } from '@/features/giving/service';

const SEED_CAMPAIGNS = [
  {
    displayName: 'Maya R.',
    title: 'First-gen nursing grad, one semester from debt-free',
    story:
      'I finished my BSN at Ohio State in May and started on a med-surg floor in Columbus in July. My remaining federal loan is small compared to most, but on a new-grad salary with rent, every dollar paid to principal shortens the timeline by weeks. I was the first in my family to finish college.',
    school: 'Ohio State University',
    fieldOfStudy: 'Nursing',
    state: 'OH',
    cohortTags: ['nursing', 'ohio', 'first-gen', 'healthcare'],
    servicerName: 'MOHELA',
    loanAccountRef: '4471029938',
    balanceCents: 1_840_000,
    interestRateBps: 550,
    monthlyPaymentCents: 21_500,
    goalCents: 250_000,
  },
  {
    displayName: 'Daniel K.',
    title: 'Teaching 7th grade math in rural Texas',
    story:
      'I teach middle school math in a Title I district outside Lubbock. I am on track for Teacher Loan Forgiveness in three more years, but interest keeps building in the meantime. Help paying down principal now means forgiveness covers more of what is left.',
    school: 'Texas Tech University',
    fieldOfStudy: 'Education',
    state: 'TX',
    cohortTags: ['teaching', 'texas', 'education', 'rural'],
    servicerName: 'Nelnet',
    loanAccountRef: '7720391145',
    balanceCents: 2_630_000,
    interestRateBps: 620,
    monthlyPaymentCents: 29_800,
    goalCents: 400_000,
  },
  {
    displayName: 'Priya S.',
    title: 'Social worker serving foster youth in Georgia',
    story:
      'My MSW from Georgia State led me straight into child welfare casework in Atlanta. The work matters and the pay is modest. I qualify for PSLF, but the payments between now and forgiveness are the hard part. Donations go to the servicer, never to me.',
    school: 'Georgia State University',
    fieldOfStudy: 'Social Work',
    state: 'GA',
    cohortTags: ['social-work', 'georgia', 'public-service', 'first-gen'],
    servicerName: 'Aidvantage',
    loanAccountRef: '3309817762',
    balanceCents: 4_120_000,
    interestRateBps: 680,
    monthlyPaymentCents: 36_200,
    goalCents: 300_000,
  },
] as const;

/** A captured gift seeded on every reset so the disbursement agent always has work. */
export const SEED_DONATION_CENTS = 10_000;
const SEED_DONATION_SPLIT_CENTS = [6_000, 4_000] as const;
const SEED_DONOR_NAME = 'Demo Donor';
const SEED_ORDER_ID = 'SEED-DEMO-ORDER';
const SEED_CAPTURE_ID = 'SEED-DEMO-CAPTURE';

const SEED_SPONSOR = {
  name: 'Buckeye Alumni Health Fund',
  cohortTag: 'nursing',
  ratioBps: 10_000,
  capCents: 100_000,
} as const;

export interface ResetDemoOptions {
  /** Seed one captured gift so the disbursement agent has work. Defaults to true. */
  readonly seedDonation?: boolean;
}

/** Wipes all demo state and reseeds. Safe to call any number of times. */
export async function resetDemo(
  sponsorEmail: string,
  options: ResetDemoOptions = {},
): Promise<{ campaignIds: readonly string[] }> {
  const db = getDb();
  await db.delete(reconciliationExceptions);
  await db.delete(ledgerEntries);
  await db.delete(agentRuns);
  await db.delete(pledges);
  await db.delete(disbursements);
  await db.delete(invoices);
  await db.delete(orders);
  await db.delete(sponsors);
  await db.delete(campaigns);
  await db.delete(borrowers);

  await ensureCampaignIndex();
  const ids: string[] = [];
  for (const seed of SEED_CAMPAIGNS) {
    const borrowerId = newId('bor');
    const campaignId = newId('cmp');
    await db.insert(borrowers).values({
      id: borrowerId,
      displayName: seed.displayName,
      email: `${borrowerId}@example.com`,
    });
    const rows = await db
      .insert(campaigns)
      .values({
        title: seed.title,
        story: seed.story,
        school: seed.school,
        fieldOfStudy: seed.fieldOfStudy,
        state: seed.state,
        servicerName: seed.servicerName,
        loanAccountRef: seed.loanAccountRef,
        balanceCents: seed.balanceCents,
        interestRateBps: seed.interestRateBps,
        monthlyPaymentCents: seed.monthlyPaymentCents,
        goalCents: seed.goalCents,
        cohortTags: [...seed.cohortTags],
        id: campaignId,
        borrowerId,
        status: 'active',
        verified: true,
      })
      .returning();
    await indexCampaign(rows[0]);
    ids.push(campaignId);
  }
  await db.insert(sponsors).values({ id: newId('spn'), email: sponsorEmail, ...SEED_SPONSOR });
  if (options.seedDonation ?? true) {
    await seedCapturedDonation(ids);
  }
  return { campaignIds: ids };
}

async function seedCapturedDonation(campaignIds: readonly string[]): Promise<void> {
  const split = SEED_DONATION_SPLIT_CENTS.map((cents, i) => ({
    campaignId: campaignIds[i],
    cents,
    reason: 'seeded demo gift',
  }));
  await recordOrder({
    paypalOrderId: SEED_ORDER_ID,
    donorName: SEED_DONOR_NAME,
    totalCents: SEED_DONATION_CENTS,
    split,
  });
  await markCaptured(SEED_ORDER_ID, SEED_CAPTURE_ID);
}
