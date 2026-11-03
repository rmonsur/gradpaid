import { describe, it, expect } from 'vitest';
import { tool } from 'ai';
import { z } from 'zod';
import { createActivityRecorder, withActivity } from '@/lib/agents/activity';

const opts = { toolCallId: 't1', messages: [] };

describe('withActivity', () => {
  it('records successful calls with timing', async () => {
    const rec = createActivityRecorder();
    const tools = withActivity(
      {
        echo: tool({ parameters: z.object({ v: z.string() }), execute: async ({ v }) => ({ v }) }),
      },
      rec,
    );
    const out = await tools.echo.execute?.({ v: 'hi' }, opts);
    expect(out).toEqual({ v: 'hi' });
    expect(rec.records).toHaveLength(1);
    expect(rec.records[0]).toMatchObject({ tool: 'echo', ok: true, input: { v: 'hi' } });
  });

  it('turns thrown errors into a returned error object and records a failure', async () => {
    const rec = createActivityRecorder();
    const tools = withActivity(
      {
        boom: tool({
          parameters: z.object({}),
          execute: async (): Promise<unknown> => {
            throw new Error('nope');
          },
        }),
      },
      rec,
    );
    const out = await tools.boom.execute?.({}, opts);
    expect(out).toEqual({ error: 'nope' });
    expect(rec.records[0].ok).toBe(false);
  });
});
