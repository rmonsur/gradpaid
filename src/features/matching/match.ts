export const BPS_DENOMINATOR = 10_000;

export interface MatchRule {
  readonly sponsorId: string;
  readonly cohortTag: string;
  readonly ratioBps: number;
  readonly capCents: number;
  readonly matchedCents: number;
}

export interface MatchResult {
  readonly sponsorId: string;
  readonly matchCents: number;
}

/**
 * Computes the sponsor match owed for a pledge against a campaign with the given
 * cohort tags. Respects the sponsor cap and never returns a negative or fractional amount.
 */
export function computeMatch(
  pledgeCents: number,
  campaignTags: readonly string[],
  rules: readonly MatchRule[],
): readonly MatchResult[] {
  return rules
    .filter((r) => campaignTags.includes(r.cohortTag))
    .map((r) => {
      const raw = Math.floor((pledgeCents * r.ratioBps) / BPS_DENOMINATOR);
      const headroom = Math.max(0, r.capCents - r.matchedCents);
      return { sponsorId: r.sponsorId, matchCents: Math.min(raw, headroom) };
    })
    .filter((m) => m.matchCents > 0);
}
