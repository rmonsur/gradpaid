import { describe, it, expect, beforeAll } from 'vitest';
import type { Tool } from 'ai';
import { resetDemo } from '@/features/demo/seed';
import { startRun, finishRun } from '@/features/runs/service';
import { listUndisbursedPledges } from '@/features/giving/service';
import {
  listDisbursements,
  recordPayoutFailed,
  recordPayoutSent,
  releasePlannedDisbursements,
  resolveDryRunPayout,
  DRY_RUN_PREFIX,
} from '@/features/disbursement/service';
import { listReconciliationExceptions, listLedger } from '@/features/ledger/service';
import { getCampaign } from '@/features/campaigns/service';
import { getSponsor, listSponsors } from '@/features/sponsors/service';
import {
  createDisbursementLocalTools,
  type DisbursementToolDeps,
} from '@/lib/agents/disbursement-tools';

interface PlanEntry {
  readonly campaignId: string;
  readonly amountCents: number;
  readonly resumeDisbursementId?: string;
}
interface PlanResult {
  readonly plan: readonly PlanEntry[];
}
interface Opened {
  readonly disbursementId: string;
  readonly amountCents: number;
}

const NURSING_PLEDGE_CENTS = 6_000;
const TEACHING_PLEDGE_CENTS = 4_000;
const INVOICE_ID = 'INV2-TEST-0001';

async function invoke<T>(tool: Tool | undefined, args: unknown): Promise<T> {
  if (!tool?.execute) {
    throw new Error('tool has no execute');
  }
  return (await tool.execute(args, { toolCallId: 'test-call', messages: [] })) as T;
}

function deps(invoiceCents: number | undefined = undefined): DisbursementToolDeps {
  return {
    verifyInvoiceCents: async () => invoiceCents,
  };
}

describe('disbursement local tools', () => {
  let runId = '';
  let nursingId = '';

  beforeAll(async () => {
    const seeded = await resetDemo('sponsor@example.com', { seedDonation: true });
    nursingId = seeded.campaignIds[0];
    runId = (await startRun('disbursement', 'test')).id;
  });

  it('dry run opens a disbursement without touching pledges or disbursements', async () => {
    const tools = createDisbursementLocalTools(runId, true, deps());
    const before = await listUndisbursedPledges();
    const opened = await invoke<Record<string, unknown>>(tools.open_disbursement, {
      campaignId: nursingId,
    });
    expect(opened).toMatchObject({
      simulated: true,
      dryRun: true,
      amountCents: NURSING_PLEDGE_CENTS,
    });
    expect(await listUndisbursedPledges()).toEqual(before);
    expect(await listDisbursements()).toEqual([]);
  });

  it('open_disbursement computes the amount from pledges and removes them from the plan', async () => {
    const tools = createDisbursementLocalTools(runId, false, deps());
    const opened = await invoke<Opened>(tools.open_disbursement, {
      campaignId: nursingId,
      amountCents: 999_999,
    });
    const replanned = await invoke<PlanResult>(tools.get_disbursement_plan, {});
    expect(opened.amountCents).toBe(NURSING_PLEDGE_CENTS);
    expect(replanned.plan.map((p) => p.amountCents)).toEqual([TEACHING_PLEDGE_CENTS]);
    const [row] = await listDisbursements();
    expect(row).toMatchObject({ id: opened.disbursementId, status: 'planned', agentRunId: runId });
  });

  it('a failed payout stays attached and is offered for resume with the same id', async () => {
    const tools = createDisbursementLocalTools(runId, false, deps());
    const [row] = await listDisbursements();
    await recordPayoutFailed(row.id, 'PayPal REST 500');
    const { plan } = await invoke<PlanResult>(tools.get_disbursement_plan, {});
    const resumable = plan.find((p) => p.campaignId === nursingId);
    expect(resumable).toMatchObject({
      amountCents: NURSING_PLEDGE_CENTS,
      resumeDisbursementId: row.id,
    });
    const reopened = await invoke<Opened>(tools.open_disbursement, { campaignId: nursingId });
    expect(reopened.disbursementId).toBe(row.id);
  });

  it('recording a sent payout writes the ledger and the campaign disbursed total', async () => {
    const [row] = await listDisbursements();
    await recordPayoutSent(row.id, { batchId: 'BATCH-REAL-1', batchStatus: 'PENDING' });
    const [updated] = await listDisbursements();
    const campaign = await getCampaign(nursingId);
    const payouts = (await listLedger()).filter((e) => e.kind === 'servicer_payout');
    expect(updated).toMatchObject({ status: 'sent', paypalPayoutBatchId: 'BATCH-REAL-1' });
    expect(campaign?.disbursedCents).toBe(NURSING_PLEDGE_CENTS);
    expect(payouts).toHaveLength(1);
    expect(payouts[0]).toMatchObject({
      amountCents: NURSING_PLEDGE_CENTS,
      paypalRef: 'BATCH-REAL-1',
    });
  });

  it('a run that dies after opening releases its planned pledges back to the plan', async () => {
    const tools = createDisbursementLocalTools(runId, false, deps());
    const teachingId = (await invoke<PlanResult>(tools.get_disbursement_plan, {})).plan[0]
      .campaignId;
    await invoke<Opened>(tools.open_disbursement, { campaignId: teachingId });
    expect((await invoke<PlanResult>(tools.get_disbursement_plan, {})).plan).toEqual([]);

    await releasePlannedDisbursements(runId);
    await finishRun(runId, 'failed', 'crashed', []);
    const { plan } = await invoke<PlanResult>(tools.get_disbursement_plan, {});
    expect(plan.map((p) => p.amountCents)).toEqual([TEACHING_PLEDGE_CENTS]);
  });

  it('record_sponsor_invoice uses the server-computed amount and rejects a mismatched invoice', async () => {
    const [sponsor] = await listSponsors();
    const wrong = createDisbursementLocalTools(runId, false, deps(NURSING_PLEDGE_CENTS + 1));
    const rejected = await invoke<Record<string, unknown>>(wrong.record_sponsor_invoice, {
      sponsorId: sponsor.id,
      paypalInvoiceId: INVOICE_ID,
      amountCents: 1,
    });
    expect(rejected).toMatchObject({ error: expect.stringContaining('amount') });
    expect((await getSponsor(sponsor.id))?.matchedCents).toBe(0);

    const right = createDisbursementLocalTools(runId, false, deps(NURSING_PLEDGE_CENTS));
    const recorded = await invoke<Record<string, unknown>>(right.record_sponsor_invoice, {
      sponsorId: sponsor.id,
      paypalInvoiceId: INVOICE_ID,
    });
    expect(recorded).toMatchObject({ ok: true, amountCents: NURSING_PLEDGE_CENTS });
    expect((await getSponsor(sponsor.id))?.matchedCents).toBe(NURSING_PLEDGE_CENTS);
  });

  it('get_ledger_expectations lists real captures and excludes seeded demo refs', async () => {
    const tools = createDisbursementLocalTools(runId, false, deps());
    const out = await invoke<{ readonly expectations: readonly { paypalRef: string }[] }>(
      tools.get_ledger_expectations,
      { days: 7 },
    );
    expect(out.expectations.every((e) => !e.paypalRef.startsWith('SEED-'))).toBe(true);
  });

  it('record_reconciliation with a mismatch creates a retrievable exception', async () => {
    const tools = createDisbursementLocalTools(runId, false, deps());
    await invoke(tools.record_reconciliation, {
      checkedCount: 3,
      mismatches: [
        {
          paypalRef: 'CAPTURE-MISMATCH',
          expectedCents: 6_000,
          actualCents: 5_500,
          detail: 'PayPal shows 55.00 but the ledger expected 60.00',
        },
      ],
    });
    const exceptions = await listReconciliationExceptions();
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0]).toMatchObject({ agentRunId: runId, paypalRef: 'CAPTURE-MISMATCH' });
  });
});

describe('dry-run payout resolution', () => {
  it('resolves a dry disbursement id to the campaign pledge total without touching rows', async () => {
    const seeded = await resetDemo('sponsor@example.com', { seedDonation: true });
    const order = await resolveDryRunPayout(`${DRY_RUN_PREFIX}${seeded.campaignIds[0]}`);
    expect(order).toMatchObject({ amountCents: NURSING_PLEDGE_CENTS });
    expect(await resolveDryRunPayout('dsb_real')).toBeUndefined();
    expect(await listDisbursements()).toEqual([]);
  });
});
