import { MAX_SPLIT_CAMPAIGNS } from '@/lib/constants';

export interface SplitCandidate {
  readonly campaignId: string;
  readonly remainingCents: number;
  readonly reason: string;
}

export interface SplitLine {
  readonly campaignId: string;
  readonly cents: number;
  readonly reason: string;
}

/**
 * Splits a donation evenly across up to MAX_SPLIT_CAMPAIGNS candidates, never
 * giving a campaign more than it still needs, and assigning leftover cents to
 * the first lines so the total always equals the donation exactly.
 */
export function splitDonation(
  totalCents: number,
  candidates: readonly SplitCandidate[],
): readonly SplitLine[] {
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    throw new Error('Donation must be a positive integer number of cents');
  }
  const open = candidates.filter((c) => c.remainingCents > 0).slice(0, MAX_SPLIT_CAMPAIGNS);
  if (open.length === 0) {
    throw new Error('No campaign can accept funds');
  }
  return allocate(totalCents, open);
}

function allocate(totalCents: number, open: readonly SplitCandidate[]): readonly SplitLine[] {
  const base = Math.floor(totalCents / open.length);
  let remainder = totalCents - base * open.length;
  let overflow = 0;
  const firstPass = open.map((c) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    const wanted = base + extra;
    const given = Math.min(wanted, c.remainingCents);
    overflow += wanted - given;
    return { campaignId: c.campaignId, cents: given, reason: c.reason };
  });
  if (overflow === 0) {
    return firstPass;
  }
  return spillOverflow(firstPass, open, overflow);
}

function spillOverflow(
  lines: readonly SplitLine[],
  open: readonly SplitCandidate[],
  overflow: number,
): readonly SplitLine[] {
  let left = overflow;
  const result = lines.map((line, i) => {
    const room = open[i].remainingCents - line.cents;
    const add = Math.min(room, left);
    left -= add;
    return { ...line, cents: line.cents + add };
  });
  if (left > 0) {
    throw new Error('Donation exceeds what the selected campaigns can accept');
  }
  return result;
}
