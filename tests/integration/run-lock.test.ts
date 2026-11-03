import { describe, it, expect, beforeAll } from 'vitest';
import { resetDemo } from '@/features/demo/seed';
import { startRun, finishRun, RunInProgressError } from '@/features/runs/service';

describe('agent run lock', () => {
  beforeAll(async () => {
    await resetDemo('sponsor@example.com', { seedDonation: false });
  });

  it('refuses a second disbursement run while one is still running, then allows it', async () => {
    const first = await startRun('disbursement', 'test');
    await expect(startRun('disbursement', 'test')).rejects.toBeInstanceOf(RunInProgressError);
    await finishRun(first.id, 'success', 'done', []);
    const second = await startRun('disbursement', 'test');
    expect(second.id).not.toBe(first.id);
  });
});
