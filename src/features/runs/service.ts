import { and, desc, eq, gt } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { agentRuns, type AgentRun, type ToolCallRecord } from '@/db/schema';
import { newId } from '@/lib/ids';

/** A run older than this is assumed dead and no longer blocks a new one. */
const RUN_LOCK_MS = 10 * 60 * 1000;

export class RunInProgressError extends Error {
  constructor(agent: string) {
    super(`A ${agent} run is already in progress`);
    this.name = 'RunInProgressError';
  }
}

/**
 * Starts a run, refusing when another run of the same agent is still live so the cron and
 * the console can never disburse the same pledges concurrently.
 */
export async function startRun(agent: string, trigger: string): Promise<AgentRun> {
  const db = getDb();
  const since = new Date(Date.now() - RUN_LOCK_MS);
  const live = await db
    .select({ id: agentRuns.id })
    .from(agentRuns)
    .where(
      and(
        eq(agentRuns.agent, agent),
        eq(agentRuns.status, 'running'),
        gt(agentRuns.startedAt, since),
      ),
    )
    .limit(1);
  if (live.length > 0) {
    throw new RunInProgressError(agent);
  }
  const rows = await db
    .insert(agentRuns)
    .values({ id: newId('run'), agent, trigger })
    .returning();
  return rows[0];
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
