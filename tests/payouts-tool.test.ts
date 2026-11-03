import { describe, it, expect, vi, afterEach } from 'vitest';
import type { PayPalAgentToolkit } from '@paypal/agent-toolkit/ai-sdk';
import { createPayoutTools } from '@/lib/paypal/payouts-tool';
import { MAX_PAYOUT_PER_RUN_CENTS } from '@/lib/constants';

const opts = { toolCallId: 't1', messages: [] };
const SERVICER = 'servicer@example.com';
const SANDBOX_BASE_URL = 'https://api-m.sandbox.paypal.com';
const HTTP_CREATED = 201;
/** Only the two client methods the REST boundary reads; everything else is never touched. */
const toolkit = {
  client: {
    getBaseUrl: (): string => SANDBOX_BASE_URL,
    getAccessToken: async (): Promise<string> => 'test-access-token',
  },
} as unknown as PayPalAgentToolkit;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const payout = {
  disbursementId: 'dsb_abc',
  receiverEmail: SERVICER,
  amountCents: 25_000,
  note: 'Loan ****1234',
};

describe('send_payout tool guard', () => {
  it('refuses a receiver that is not allowlisted', async () => {
    const tools = createPayoutTools(toolkit, {
      allowedReceivers: [SERVICER],
      spent: { value: 0 },
      dryRun: false,
    });
    const out = await tools.send_payout.execute?.(
      { ...payout, receiverEmail: 'attacker@example.com' },
      opts,
    );
    expect(out).toEqual({ error: 'receiver not allowlisted' });
  });

  it('refuses when the running total plus this amount would exceed the per-run cap', async () => {
    const spent = { value: MAX_PAYOUT_PER_RUN_CENTS - 1 };
    const tools = createPayoutTools(toolkit, {
      allowedReceivers: [SERVICER],
      spent,
      dryRun: false,
    });
    const out = await tools.send_payout.execute?.({ ...payout, amountCents: 2 }, opts);
    expect(out).toEqual({ error: 'per-run payout cap exceeded' });
    expect(spent.value).toBe(MAX_PAYOUT_PER_RUN_CENTS - 1);
  });

  it('returns a simulated result without calling PayPal in dry run', async () => {
    const send = vi.fn();
    const tools = createPayoutTools(
      toolkit,
      { allowedReceivers: [SERVICER], spent: { value: 0 }, dryRun: true },
      send,
    );
    const out = await tools.send_payout.execute?.(payout, opts);
    expect(out).toMatchObject({ simulated: true, dryRun: true });
    expect(send).not.toHaveBeenCalled();
  });

  it('sends through PayPal with the disbursement idempotency key and advances spent', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        {
          batch_header: { payout_batch_id: 'BATCH123', batch_status: 'PENDING' },
          items: [{ payout_item_id: 'ITEM456' }],
        },
        HTTP_CREATED,
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const spent = { value: 1_000 };
    const tools = createPayoutTools(toolkit, {
      allowedReceivers: [SERVICER],
      spent,
      dryRun: false,
    });
    const out = await tools.send_payout.execute?.(payout, opts);
    expect(out).toEqual({ batchId: 'BATCH123', batchStatus: 'PENDING', itemId: 'ITEM456' });
    expect(spent.value).toBe(26_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api-m.sandbox.paypal.com/v1/payments/payouts');
    expect(init.headers).toMatchObject({ 'PayPal-Request-Id': 'gradpaid-dsb_abc' });
    const sent = JSON.parse(String(init.body)) as {
      sender_batch_header: { sender_batch_id: string };
      items: { receiver: string; amount: { value: string } }[];
    };
    expect(sent.sender_batch_header.sender_batch_id).toBe('gradpaid-dsb_abc');
    expect(sent.items[0].receiver).toBe(SERVICER);
    expect(sent.items[0].amount.value).toBe('250.00');
  });
});
