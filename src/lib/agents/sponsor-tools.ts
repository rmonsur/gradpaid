import { tool, type Tool } from 'ai';
import { z } from 'zod';
import {
  cohortPledgedCents,
  getInvoiceByPayPalId,
  getSponsor,
  markInvoicePaid,
} from '@/features/sponsors/service';

/** PayPal reads and writes the sponsor agent needs; injected so the guards test without PayPal. */
export interface SponsorToolDeps {
  /** The invoice total as PayPal holds it, in cents. */
  readonly readInvoiceCents: (paypalInvoiceId: string) => Promise<number | undefined>;
  /** Records the sponsor's payment against the PayPal invoice. */
  readonly recordPayment: (paypalInvoiceId: string, amountCents: number) => Promise<void>;
}

const invoiceInput = z.object({ paypalInvoiceId: z.string().min(1) });

/**
 * Tools for an agent that acts for ONE sponsor. It can read the evidence behind an invoice,
 * pay it, or decline it. It can never pay an amount other than the one PayPal and GradPaid
 * agree on, and never touches another sponsor's invoices.
 */
export function createSponsorTools(
  sponsorId: string,
  deps: SponsorToolDeps,
): Readonly<Record<string, Tool>> {
  async function ownInvoice(
    paypalInvoiceId: string,
  ): Promise<
    | { readonly ok: true; readonly amountCents: number; readonly status: string }
    | { readonly ok: false; readonly error: string }
  > {
    const invoice = await getInvoiceByPayPalId(paypalInvoiceId);
    if (!invoice || invoice.sponsorId !== sponsorId) {
      return { ok: false, error: 'invoice not addressed to this sponsor' };
    }
    return { ok: true, amountCents: invoice.amountCents, status: invoice.status };
  }

  return {
    get_match_evidence: tool({
      description:
        "Show what an invoice is for: the sponsor's match rule, the cents pledged to its cohort, the amount GradPaid billed, and the total PayPal holds for the invoice.",
      parameters: invoiceInput,
      execute: async ({ paypalInvoiceId }): Promise<unknown> => {
        const own = await ownInvoice(paypalInvoiceId);
        if (!own.ok) {
          return { error: own.error };
        }
        const sponsor = await getSponsor(sponsorId);
        if (!sponsor) {
          return { error: 'sponsor not found' };
        }
        return {
          sponsorName: sponsor.name,
          cohortTag: sponsor.cohortTag,
          ratioBps: sponsor.ratioBps,
          capCents: sponsor.capCents,
          /** Matched before this invoice; GradPaid books the match when it issues the invoice. */
          alreadyMatchedCents: Math.max(0, sponsor.matchedCents - own.amountCents),
          cohortPledgedCents: await cohortPledgedCents(sponsor.cohortTag),
          billedCents: own.amountCents,
          paypalInvoiceCents: await deps.readInvoiceCents(paypalInvoiceId),
          invoiceStatus: own.status,
        };
      },
    }),
    approve_and_pay: tool({
      description:
        'Pay the invoice in full through PayPal. Only call after the evidence shows the bill matches the match rule.',
      parameters: invoiceInput,
      execute: async ({ paypalInvoiceId }): Promise<unknown> => {
        const own = await ownInvoice(paypalInvoiceId);
        if (!own.ok) {
          return { error: own.error };
        }
        if (own.status !== 'sent') {
          return { error: `invoice is not open (status ${own.status})` };
        }
        const paypalCents = await deps.readInvoiceCents(paypalInvoiceId);
        if (paypalCents !== own.amountCents) {
          return {
            error: `PayPal invoice total ${paypalCents ?? 'unknown'} does not match the ${own.amountCents} cents billed`,
          };
        }
        await deps.recordPayment(paypalInvoiceId, own.amountCents);
        await markInvoicePaid(paypalInvoiceId);
        return { ok: true, amountCents: own.amountCents };
      },
    }),
    decline: tool({
      description: 'Decline to pay an invoice, with the reason the sponsor would give GradPaid.',
      parameters: invoiceInput.extend({ reason: z.string().min(1).max(300) }),
      execute: async ({ paypalInvoiceId, reason }): Promise<unknown> => {
        const own = await ownInvoice(paypalInvoiceId);
        return own.ok ? { declined: true, reason } : { error: own.error };
      },
    }),
  };
}
