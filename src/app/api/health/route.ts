import { ok } from '@/lib/http';
import { logger } from '@/lib/logger';
import { getEnv, isElasticConfigured } from '@/lib/env';
import { getDb } from '@/db/client';
import { sql } from 'drizzle-orm';
import { createPayPalToolkit } from '@/lib/paypal/toolkit';
import { getElastic } from '@/lib/elastic/client';
import { listRuns } from '@/features/runs/service';

interface Check {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
}

async function probe(name: string, fn: () => Promise<string>): Promise<Check> {
  try {
    return { name, ok: true, detail: await fn() };
  } catch (err) {
    logger.warn({ err, check: name }, 'health check failed');
    return { name, ok: false, detail: 'unavailable' };
  }
}

export async function GET(): Promise<Response> {
  const checks = await Promise.all([
    probe('env', async () => {
      getEnv();
      return 'valid';
    }),
    probe('database', async () => {
      await getDb().execute(sql`select 1`);
      return 'reachable';
    }),
    probe('paypal_sandbox', async () => {
      const { toolkit } = createPayPalToolkit({});
      await toolkit.client.getAccessToken();
      return 'token ok';
    }),
    probe('elastic', async () => {
      if (!isElasticConfigured(getEnv())) {
        return 'not configured, using postgres search';
      }
      await getElastic()?.ping();
      return 'reachable';
    }),
    probe('last_agent_run', async () => {
      const runs = await listRuns(1);
      const last = runs[0];
      return last ? `${last.agent} ${last.status} at ${last.startedAt.toISOString()}` : 'none yet';
    }),
  ]);
  const healthy = checks.filter((c) => c.name !== 'last_agent_run').every((c) => c.ok);
  return ok({ healthy, checks, at: new Date().toISOString() }, healthy ? 200 : 503);
}
