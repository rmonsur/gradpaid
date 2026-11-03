import { and, desc, eq, lt } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { agentRuns, type AgentRun, type ToolCallRecord } from '@/db/schema';
import { newId } from '@/lib/ids';

/** A run older than this is assumed dead and is marked failed so it no longer holds the lock. */
const RUN_LOCK_MS = 10 * 60 * 1000;
const STALE_RUN_SUMMARY = 'Run did not finish within the lock window and was marked failed.';
const PG_UNIQUE_VIOLATION = '23505';

export class RunInProgressError extends Error {
  constructor(agent: string) {
    super(`A ${agent} run is already in progress`);
    this.name = 'RunInProgressError';
  }
}

/** Drizzle wraps driver errors; the Postgres code lives on the error or its cause chain. */
function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) {
    return false;
  }
  if ('code' in err && err.code === PG_UNIQUE_VIOLATION) {
    return true;
  }
  return 'cause' in err ? isUniqueViolation(err.cause) : false;
}

/**
 * Starts a run. A partial unique index allows one 'running' row per agent, so the cron and the
 * console can never disburse the same pledges concurrently; stale rows are expired first.
 */
export async function startRun(agent: string, trigger: string): Promise<AgentRun> {
  const db = getDb();
  const since = new Date(Date.now() - RUN_LOCK_MS);
  await db
    .update(agentRuns)
    .set({ status: 'failed', summary: STALE_RUN_SUMMARY, finishedAt: new Date() })
    .where(
      and(
        eq(agentRuns.agent, agent),
        eq(agentRuns.status, 'running'),
        lt(agentRuns.startedAt, since),
      ),
    );
  try {
    const rows = await db
      .insert(agentRuns)
      .values({ id: newId('run'), agent, trigger })
      .returning();
    return rows[0];
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new RunInProgressError(agent);
    }
    throw err;
  }
}

export async function finishRun(
  id: string,
  status: 'success' | 'failed',
  summary: string,
  toolCalls: readonly ToolCallRecord[],
): Promise<void> {
  await getDb()
    .update(agentRuns)
    .set({ status, summary, toolCalls, finishedAt: new Date() })
    .where(eq(agentRuns.id, id));
}

export async function listRuns(limit = 20): Promise<readonly AgentRun[]> {
  return getDb().select().from(agentRuns).orderBy(desc(agentRuns.startedAt)).limit(limit);
}

export async function getRun(id: string): Promise<AgentRun | undefined> {
  const rows = await getDb().select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1);
  return rows[0];
}
