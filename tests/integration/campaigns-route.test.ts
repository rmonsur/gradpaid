import { describe, it, expect, beforeAll } from 'vitest';
import { resetDemo } from '@/features/demo/seed';
import { POST } from '@/app/api/campaigns/route';
import { listActiveCampaigns, getCampaign } from '@/features/campaigns/service';
import { signLoanFacts } from '@/lib/intake-token';
import type { ApiEnvelope } from '@/lib/http';

const SEEDED_ACTIVE_COUNT = 3;
const BOGUS_TOKEN = 'f'.repeat(64);

const loanFacts = {
  servicerName: 'Nelnet',
  loanAccountRef: '9988776655',
  balanceCents: 1_200_000,
  interestRateBps: 480,
  monthlyPaymentCents: 15_000,
} as const;

const campaignBody = {
  displayName: 'Jordan P.',
  email: 'jordan@example.com',
  title: 'Paying down pharmacy school loans',
  story: 'I graduated with a PharmD and work at a rural community pharmacy serving two counties.',
  school: 'University of Iowa',
  fieldOfStudy: 'Pharmacy',
  state: 'IA',
  cohortTags: ['pharmacy', 'iowa', 'healthcare'],
  ...loanFacts,
  goalCents: 200_000,
} as const;

function postJson(body: unknown): Promise<Response> {
  return POST(
    new Request('http://localhost/api/campaigns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('POST /api/campaigns', () => {
  beforeAll(async () => {
    await resetDemo('sponsor@example.com', { seedDonation: false });
  });

  it('rejects a body whose intake token does not match the loan facts and creates nothing', async () => {
    const res = await postJson({ ...campaignBody, intakeToken: BOGUS_TOKEN });
    const envelope = (await res.json()) as ApiEnvelope<unknown>;
    expect(res.status).toBe(401);
    expect(envelope.success).toBe(false);
    expect(await listActiveCampaigns()).toHaveLength(SEEDED_ACTIVE_COUNT);
  });

  it('rejects a goal above the signed loan balance', async () => {
    const res = await postJson({
      ...campaignBody,
      goalCents: 1_200_001,
      intakeToken: signLoanFacts(loanFacts),
    });
    expect(res.status).toBe(400);
    expect(await listActiveCampaigns()).toHaveLength(SEEDED_ACTIVE_COUNT);
  });

  it('creates an active, verified campaign when the token matches and the goal fits', async () => {
    const res = await postJson({ ...campaignBody, intakeToken: signLoanFacts(loanFacts) });
    const envelope = (await res.json()) as ApiEnvelope<{ readonly id: string }>;
    expect(res.status).toBe(201);
    expect(envelope.success).toBe(true);
    const created = await getCampaign(envelope.data?.id ?? '');
    expect(created).toMatchObject({
      title: 'Paying down pharmacy school loans',
      goalCents: 200_000,
      status: 'active',
      verified: true,
    });
    expect(await listActiveCampaigns()).toHaveLength(SEEDED_ACTIVE_COUNT + 1);
  });
});
