import { randomUUID } from 'node:crypto';

export type IdPrefix =
  'bor' | 'cmp' | 'spn' | 'ord' | 'plg' | 'inv' | 'dsb' | 'led' | 'run' | 'exc';

export function newId(prefix: IdPrefix): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

/**
 * Deterministic sender_item_id for a PayPal payout. Reusing it on retry makes
 * PayPal reject a duplicate rather than paying twice.
 */
export function payoutItemKey(disbursementId: string): string {
  return `gradpaid-${disbursementId}`;
}
