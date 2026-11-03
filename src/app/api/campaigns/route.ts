import { z } from 'zod';
import { CAMPAIGN_LIMITS } from '@/features/campaigns/limits';
import { ok, fail, handle } from '@/lib/http';
import { verifyLoanFacts } from '@/lib/intake-token';
import { listActiveCampaigns, createCampaign } from '@/features/campaigns/service';
import { indexCampaign } from '@/features/search/service';

export async function GET(): Promise<Response> {
  return handle(async () => ok(await listActiveCampaigns()));
}

const createSchema = z.object({
  displayName: z.string().min(1).max(CAMPAIGN_LIMITS.nameMax),
  email: z.string().email(),
  title: z.string().min(CAMPAIGN_LIMITS.titleMin).max(CAMPAIGN_LIMITS.titleMax),
  story: z.string().min(CAMPAIGN_LIMITS.storyMin).max(CAMPAIGN_LIMITS.storyMax),
  school: z.string().min(2).max(120),
  fieldOfStudy: z.string().min(CAMPAIGN_LIMITS.fieldMin).max(CAMPAIGN_LIMITS.fieldMax),
  state: z.string().length(2),
  cohortTags: z.array(z.string().min(1).max(CAMPAIGN_LIMITS.tagMax)).max(CAMPAIGN_LIMITS.tagsMax),
  servicerName: z.string().min(2).max(60),
  loanAccountRef: z.string().min(CAMPAIGN_LIMITS.loanRefMin).max(CAMPAIGN_LIMITS.loanRefMax),
  balanceCents: z.number().int().nonnegative(),
  interestRateBps: z.number().int().nonnegative(),
  monthlyPaymentCents: z.number().int().nonnegative(),
  goalCents: z.number().int().positive(),
  intakeToken: z.string().length(64),
});

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const input = createSchema.parse(await req.json());
    const { displayName, email, intakeToken, ...campaignFields } = input;
    if (campaignFields.goalCents > campaignFields.balanceCents) {
      return fail('Goal cannot exceed the loan balance', 400);
    }
    if (!verifyLoanFacts(campaignFields, intakeToken)) {
      return fail('Loan facts do not match what the intake agent read from the statement', 401);
    }
    const created = await createCampaign({
      borrower: { displayName, email },
      campaign: { ...campaignFields, status: 'active', verified: true },
    });
    await indexCampaign(created);
    return ok({ id: created.id }, 201);
  });
}
