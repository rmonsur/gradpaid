import { describe, it, expect, vi, afterEach } from 'vitest';
import type { PayPalAgentToolkit } from '@paypal/agent-toolkit/ai-sdk';
import { paypalRest, PayPalRestError } from '@/lib/paypal/rest';

const SANDBOX_BASE_URL = 'https://api-m.sandbox.paypal.com';
const ACCESS_TOKEN = 'A21AAJ-secret-access-token';
const HTTP_OK = 200;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_BAD_REQUEST = 400;

const toolkit = {
  client: {
    getBaseUrl: (): string => SANDBOX_BASE_URL,
    getAccessToken: async (): Promise<string> => ACCESS_TOKEN,
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
  vi.useRealTimers();
});

describe('paypalRest', () => {
  it('retries a 429 and resolves with the body of the following 200', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ name: 'RATE_LIMIT_REACHED' }, HTTP_TOO_MANY_REQUESTS))
      .mockResolvedValueOnce(jsonResponse({ id: 'ORDER-1', status: 'COMPLETED' }, HTTP_OK));
    vi.stubGlobal('fetch', fetchMock);
    const pending = paypalRest<{ id: string }>(toolkit, {
      method: 'GET',
      path: '/v2/checkout/orders/ORDER-1',
    });
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toEqual({ id: 'ORDER-1', status: 'COMPLETED' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a 400 without retrying and without leaking the bearer token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ name: 'INVALID_REQUEST' }, HTTP_BAD_REQUEST));
    vi.stubGlobal('fetch', fetchMock);
    const pending = paypalRest(toolkit, {
      method: 'POST',
      path: '/v1/payments/payouts',
      body: { items: [] },
    });
    const err = await pending.then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(PayPalRestError);
    expect((err as PayPalRestError).status).toBe(HTTP_BAD_REQUEST);
    expect((err as Error).message).toBe('PayPal REST 400');
    expect((err as Error).message).not.toContain(ACCESS_TOKEN);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
