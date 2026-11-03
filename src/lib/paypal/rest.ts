import type { PayPalAgentToolkit } from '@paypal/agent-toolkit/ai-sdk';
import { logger } from '@/lib/logger';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = 400;

export class PayPalRestError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`PayPal REST ${status}`);
  }
}

export interface RestOptions {
  readonly method: 'GET' | 'POST';
  readonly path: string;
  readonly body?: unknown;
  readonly requestId?: string;
}

/**
 * Minimal authenticated fetch against the PayPal REST API, reusing the Agent Toolkit's
 * OAuth client so there is one source of credentials. Used only for products the toolkit
 * does not yet expose as tools (Payouts) and for webhook verification.
 */
export async function paypalRest<T>(toolkit: PayPalAgentToolkit, opts: RestOptions): Promise<T> {
  const url = `${toolkit.client.getBaseUrl()}${opts.path}`;
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const token = await toolkit.client.getAccessToken();
    const res = await fetch(url, {
      method: opts.method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(opts.requestId ? { 'PayPal-Request-Id': opts.requestId } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    const text = await res.text();
    const parsed: unknown = text.length > 0 ? JSON.parse(text) : null;
    if (res.ok) {
      return parsed as T;
    }
    lastError = new PayPalRestError(res.status, parsed);
    if (!RETRYABLE_STATUS.has(res.status)) {
      throw lastError;
    }
    logger.warn({ status: res.status, attempt, path: opts.path }, 'paypal rest retry');
    await new Promise((r) => setTimeout(r, BACKOFF_MS * attempt));
  }
  throw lastError;
}
