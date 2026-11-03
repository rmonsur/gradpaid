import { describe, it, expect, vi } from 'vitest';
import type { PayPalAgentToolkit } from '@paypal/agent-toolkit/ai-sdk';
import { createPayoutTools, type PayoutDeps } from '@/lib/paypal/payouts-tool';
import type { PayoutResult } from '@/lib/paypal/payouts';
import { MAX_PAYOUT_PER_RUN_CENTS } from '@/lib/constants';

const opts = { toolCallId: 't1', messages: [] };
const SERVICER = 'servicer@example.com';
const toolkit = {} as PayPalAgentToolkit;
const DISBURSEMENT = { id: 'dsb_abc', amountCents: 25_000, note: 'Loan ****1234' };
const SENT: PayoutResult = { batchId: 'BATCH123', batchStatus: 'PENDING', itemId: 'ITEM456' };

function deps(overrides: Partial<PayoutDeps> = {}): PayoutDeps {
  return {
    receiverEmail: SERVICER,
    dryRun: false,
    resolve: async (id) => (id === DISBURSEMENT.id ? DISBURSEMENT : undefined),
    spentCents: async () => 0,
    onSent: vi.fn(async () => undefined),
    onFailed: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('send_payout tool', () => {
  it('refuses a disbursement id the server does not know', async () => {
    const send = vi.fn();
    const tools = createPayoutTools(toolkit, deps(), send);
    const out = await tools.send_payout.execute?.({ disbursementId: 'dsb_unknown' }, opts);
    expect(out).toEqual({ error: 'unknown or already paid disbursement' });
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses when the amount already sent this run plus this one exceeds the cap', async () => {
    const send = vi.fn();
    const tools = createPayoutTools(
      toolkit,
      deps({ spentCents: async () => MAX_PAYOUT_PER_RUN_CENTS - 1 }),
      send,
    );
    const out = await tools.send_payout.execute?.({ disbursementId: DISBURSEMENT.id }, opts);
    expect(out).toEqual({ error: 'per-run payout cap exceeded' });
    expect(send).not.toHaveBeenCalled();
  });

  it('simulates in dry run without calling PayPal or recording anything', async () => {
    const send = vi.fn();
    const d = deps({ dryRun: true });
    const tools = createPayoutTools(toolkit, d, send);
    const out = await tools.send_payout.execute?.({ disbursementId: DISBURSEMENT.id }, opts);
    expect(out).toMatchObject({ simulated: true, dryRun: true, amountCents: 25_000 });
    expect(send).not.toHaveBeenCalled();
    expect(d.onSent).not.toHaveBeenCalled();
  });

  it('sends the server-resolved amount to the configured receiver with the idempotency key', async () => {
    const send = vi.fn(async () => SENT);
    const d = deps();
    const tools = createPayoutTools(toolkit, d, send);
    const out = await tools.send_payout.execute?.({ disbursementId: DISBURSEMENT.id }, opts);
    expect(send).toHaveBeenCalledWith(toolkit, {
      disbursementId: 'dsb_abc',
      receiverEmail: SERVICER,
      amountCents: 25_000,
      note: 'Loan ****1234',
    });
    expect(out).toEqual({ ...SENT, amountCents: 25_000 });
    expect(d.onSent).toHaveBeenCalledWith('dsb_abc', SENT);
  });

  it('records a failure and returns an error when PayPal rejects the payout', async () => {
    const send = vi.fn(async () => {
      throw new Error('PayPal REST 400');
    });
    const d = deps();
    const tools = createPayoutTools(toolkit, d, send);
    const out = await tools.send_payout.execute?.({ disbursementId: DISBURSEMENT.id }, opts);
    expect(out).toEqual({ error: 'payout failed', detail: 'PayPal REST 400' });
    expect(d.onFailed).toHaveBeenCalledWith('dsb_abc', 'PayPal REST 400');
  });
});
