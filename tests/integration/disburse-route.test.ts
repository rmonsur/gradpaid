import { describe, it, expect, beforeAll } from 'vitest';
import { resetDemo } from '@/features/demo/seed';
import { POST } from '@/app/api/disburse/route';
import { listRuns } from '@/features/runs/service';

describe('POST /api/disburse', () => {
  beforeAll(async () => {
    await resetDemo('sponsor@example.com', { seedDonation: true });
  });

  it('returns 401 without a bearer token and starts no agent run', async () => {
    const res = await POST(
      new Request('http://localhost/api/disburse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dryRun: true }),
      }),
    );
    expect(res.status).toBe(401);
    expect(await listRuns()).toEqual([]);
  });
});
