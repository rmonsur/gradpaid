import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { handle, ok, checkInternalAuth } from '@/lib/http';

const HTTP_BAD_REQUEST = 400;
const HTTP_SERVER_ERROR = 500;
const TEST_CRON_SECRET = 'cron-secret-for-tests';
const TEST_DEMO_TOKEN = 'demo-token-for-tests';
// getEnv() caches on first read, so these must be set before any call into http.ts.
process.env.CRON_SECRET = TEST_CRON_SECRET;
process.env.DEMO_TOKEN = TEST_DEMO_TOKEN;
const SECRET_IN_ERROR = 'postgres://user:hunter2@db.internal/gradpaid';

describe('handle', () => {
  it('turns a zod validation failure into a 400 envelope naming the bad field', async () => {
    const res = await handle(async () => {
      const parsed = z.object({ amountCents: z.number().int() }).parse({ amountCents: 'ten' });
      return ok(parsed);
    });
    const body = await res.json();
    expect(res.status).toBe(HTTP_BAD_REQUEST);
    expect(body.success).toBe(false);
    expect(body.data).toBeNull();
    expect(body.error).toContain('amountCents');
  });

  it('turns an unexpected error into a 500 envelope that never echoes the thrown message', async () => {
    const res = await handle(async () => {
      throw new Error(`connection refused: ${SECRET_IN_ERROR}`);
    });
    const body = await res.json();
    expect(res.status).toBe(HTTP_SERVER_ERROR);
    expect(body.success).toBe(false);
    expect(body.data).toBeNull();
    expect(JSON.stringify(body)).not.toContain(SECRET_IN_ERROR);
    expect(JSON.stringify(body)).not.toContain('connection refused');
  });
});

function requestWithAuth(header: string | undefined): Request {
  return new Request('http://localhost/api/disburse', {
    method: 'POST',
    headers: header === undefined ? {} : { Authorization: header },
  });
}

describe('checkInternalAuth', () => {
  it('accepts the cron secret as a bearer token when cron is allowed', () => {
    const req = requestWithAuth(`Bearer ${TEST_CRON_SECRET}`);
    expect(checkInternalAuth(req, ['cron'])).toBe(true);
  });

  it('accepts the demo token only when demo is in the allowed kinds', () => {
    const req = requestWithAuth(`Bearer ${TEST_DEMO_TOKEN}`);
    expect(checkInternalAuth(req, ['demo'])).toBe(true);
    expect(checkInternalAuth(req, ['cron'])).toBe(false);
  });

  it('rejects a missing, malformed, or wrong bearer token', () => {
    expect(checkInternalAuth(requestWithAuth(undefined), ['cron', 'demo'])).toBe(false);
    expect(checkInternalAuth(requestWithAuth('Bearer '), ['cron', 'demo'])).toBe(false);
    expect(checkInternalAuth(requestWithAuth(TEST_CRON_SECRET), ['cron', 'demo'])).toBe(false);
    expect(checkInternalAuth(requestWithAuth('Bearer not-the-secret'), ['cron', 'demo'])).toBe(
      false,
    );
  });
});
