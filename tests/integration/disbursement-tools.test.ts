import { describe, it, expect, beforeAll } from 'vitest';
import type { Tool } from 'ai';
import { resetDemo } from '@/features/demo/seed';
import { startRun } from '@/features/runs/service';
import { listUndisbursedPledges } from '@/features/giving/service';
import { listDisbursements } from '@/features/disbursement/service';
import { listReconciliationExceptions } from '@/features/ledger/service';
import { createDisbursementLocalTools } from '@/lib/agents/disbursement-tools';
import type { PlannedDisbursement } from '@/features/disbursement/plan';

interface PlanResult {
  readonly plan: readonly PlannedDisbursement[];
}

/** Invokes a tool the way the AI SDK does, with the args a model would produce. */
async function invoke<T>(tool: Tool | undefined, args: unknown): Promise<T> {
  if (!tool?.execute) {
    throw new Error('tool has no execute');
  }
  return (await tool.execute(args, { toolCallId: 'test-call', messages: [] })) as T;
}

describe('disbursement local tools', () => {
  let runId = '';

  beforeAll(async () => {
    await resetDemo('sponsor@example.com', { seedDonation: true });
    runId = (await startRun('disbursement', 'test')).id;
  });

  it('dry run opens and closes a disbursement without touching pledges or disbursements', async () => {
    const tools = createDisbursementLocalTools(runId, true);
    const before = await listUndisbursedPledges();
    const { plan } = await invoke<PlanResult>(tools.get_disbursement_plan, {});
    const [first] = plan;

    const opened = await invoke<Record<string, unknown>>(tools.open_disbursement, first);
    const closed = await invoke<Record<string, unknown>>(tools.close_disbursement, {
      disbursementId: opened.disbursementId,
      campaignId: first.campaignId,
      amountCents: first.amountCents,
      ok: true,
      batchId: 'DRY-BATCH',
    });

    expect(opened).toMatchObject({ simulated: true, dryRun: true });
    expect(closed).toMatchObject({ simulated: true, dryRun: true });
    expect(await listUndisbursedPledges()).toEqual(before);
    expect(await listDisbursements()).toEqual([]);
  });

  it('real run attaches planned pledges and records the payout batch id on close', async () => {
    const tools = createDisbursementLocalTools(runId, false);
    const { plan } = await invoke<PlanResult>(tools.get_disbursement_plan, {});
    const [first] = plan;

    const opened = await invoke<{ readonly disbursementId: string }>(
      tools.open_disbursement,
      first,
    );
    const replanned = await invoke<PlanResult>(tools.get_disbursement_plan, {});
    await invoke(tools.close_disbursement, {
      disbursementId: opened.disbursementId,
      campaignId: first.campaignId,
      amountCents: first.amountCents,
      ok: true,
      batchId: 'BATCH-REAL-1',
      itemId: 'ITEM-REAL-1',
    });

    expect(first.amountCents).toBe(6_000);
    expect(replanned.plan.map((p) => p.amountCents)).toEqual([4_000]);
    const [recorded] = await listDisbursements();
    expect(recorded).toMatchObject({
      id: opened.disbursementId,
      amountCents: 6_000,
      status: 'sent',
      paypalPayoutBatchId: 'BATCH-REAL-1',
      agentRunId: runId,
    });
  });

  it('record_reconciliation with a mismatch creates a retrievable exception', async () => {
    const tools = createDisbursementLocalTools(runId, false);
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
    expect(exceptions[0]).toMatchObject({
      agentRunId: runId,
      paypalRef: 'CAPTURE-MISMATCH',
      expectedCents: 6_000,
      actualCents: 5_500,
      detail: 'PayPal shows 55.00 but the ledger expected 60.00',
    });
  });
});
