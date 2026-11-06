import { describe, it, expect, beforeAll } from 'vitest';
import { resetDemo } from '@/features/demo/seed';
import {
  listSponsors,
  recordInvoice,
  markInvoicePaid,
  listInvoices,
} from '@/features/sponsors/service';
import { listLedger } from '@/features/ledger/service';

const INVOICE = 'INV2-PAID-TEST';

describe('markInvoicePaid', () => {
  beforeAll(async () => {
    await resetDemo('sponsor@example.com', { seedDonation: true });
    const [sponsor] = await listSponsors();
    await recordInvoice({
      sponsorId: sponsor.id,
      paypalInvoiceId: INVOICE,
      amountCents: 6_000,
      status: 'sent',
    });
  });

  it('marks the invoice paid and writes one sponsor_paid row even when called twice', async () => {
    await Promise.all([markInvoicePaid(INVOICE), markInvoicePaid(INVOICE)]);
    const [invoice] = await listInvoices();
    const paid = (await listLedger()).filter((e) => e.kind === 'sponsor_paid');
    expect(invoice.status).toBe('paid');
    expect(paid).toHaveLength(1);
    expect(paid[0]).toMatchObject({ amountCents: 6_000, paypalRef: INVOICE });
  });

  it('returns false for an invoice GradPaid never issued', async () => {
    expect(await markInvoicePaid('INV2-UNKNOWN')).toBe(false);
  });
});
