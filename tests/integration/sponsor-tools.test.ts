import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { Tool } from 'ai';
import { resetDemo } from '@/features/demo/seed';
import { listSponsors, recordInvoice, listInvoices } from '@/features/sponsors/service';
import { listLedger } from '@/features/ledger/service';
import { createSponsorTools, type SponsorToolDeps } from '@/lib/agents/sponsor-tools';

const INVOICE = 'INV2-SPONSOR-1';

async function invoke<T>(tool: Tool | undefined, args: unknown): Promise<T> {
  if (!tool?.execute) {
    throw new Error('tool has no execute');
  }
  return (await tool.execute(args, { toolCallId: 't', messages: [] })) as T;
}

function deps(paypalCents: number): SponsorToolDeps {
  return { readInvoiceCents: async () => paypalCents, recordPayment: vi.fn(async () => undefined) };
}

describe('sponsor agent tools', () => {
  let sponsorId = '';

  beforeAll(async () => {
    await resetDemo('sponsor@example.com', { seedDonation: true });
    sponsorId = (await listSponsors())[0].id;
    await recordInvoice({
      sponsorId,
      paypalInvoiceId: INVOICE,
      amountCents: 6_000,
      status: 'sent',
    });
  });

  it('shows the evidence behind an invoice: cohort pledges and the amount GradPaid billed', async () => {
    const tools = createSponsorTools(sponsorId, deps(6_000));
    const evidence = await invoke<Record<string, unknown>>(tools.get_match_evidence, {
      paypalInvoiceId: INVOICE,
    });
    expect(evidence).toMatchObject({
      billedCents: 6_000,
      cohortTag: 'nursing',
      cohortPledgedCents: 6_000,
      alreadyMatchedCents: 0,
    });
  });

  it('refuses to pay when PayPal shows a different invoice total', async () => {
    const d = deps(9_999);
    const tools = createSponsorTools(sponsorId, d);
    const out = await invoke<Record<string, unknown>>(tools.approve_and_pay, {
      paypalInvoiceId: INVOICE,
    });
    expect(out).toMatchObject({ error: expect.stringContaining('does not match') });
    expect(d.recordPayment).not.toHaveBeenCalled();
    expect((await listInvoices())[0].status).toBe('sent');
  });

  it('pays a matching invoice through PayPal and books sponsor_paid once', async () => {
    const d = deps(6_000);
    const tools = createSponsorTools(sponsorId, d);
    const out = await invoke<Record<string, unknown>>(tools.approve_and_pay, {
      paypalInvoiceId: INVOICE,
    });
    const again = await invoke<Record<string, unknown>>(tools.approve_and_pay, {
      paypalInvoiceId: INVOICE,
    });
    expect(out).toMatchObject({ ok: true, amountCents: 6_000 });
    expect(again).toMatchObject({ error: expect.stringContaining('not open') });
    expect(d.recordPayment).toHaveBeenCalledTimes(1);
    expect((await listLedger()).filter((e) => e.kind === 'sponsor_paid')).toHaveLength(1);
  });

  it('will not touch another sponsor’s invoice', async () => {
    const tools = createSponsorTools('spn_someone_else', deps(6_000));
    const out = await invoke<Record<string, unknown>>(tools.get_match_evidence, {
      paypalInvoiceId: INVOICE,
    });
    expect(out).toMatchObject({ error: expect.stringContaining('not addressed') });
  });
});
