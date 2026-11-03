import { MIN_DISBURSEMENT_CENTS } from '@/lib/constants';

export interface PledgeLike {
  readonly id: string;
  readonly campaignId: string;
  readonly cents: number;
}

export interface PlannedDisbursement {
  readonly campaignId: string;
  readonly amountCents: number;
  readonly pledgeIds: readonly string[];
}

/**
 * Groups undisbursed pledges by campaign and drops any group below the minimum
 * worth sending. Pure so the agent's plan is testable and deterministic.
 */
export function planDisbursements(
  pledges: readonly PledgeLike[],
  minCents: number = MIN_DISBURSEMENT_CENTS,
): readonly PlannedDisbursement[] {
  const groups = new Map<string, { cents: number; ids: string[] }>();
  for (const p of pledges) {
    const g = groups.get(p.campaignId) ?? { cents: 0, ids: [] };
    groups.set(p.campaignId, { cents: g.cents + p.cents, ids: [...g.ids, p.id] });
  }
  return [...groups.entries()]
    .filter(([, g]) => g.cents >= minCents)
    .map(([campaignId, g]) => ({ campaignId, amountCents: g.cents, pledgeIds: g.ids }))
    .sort((a, b) => b.amountCents - a.amountCents);
}
