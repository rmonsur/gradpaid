import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { agentRuns, type AgentRun, type ToolCallRecord } from '@/db/schema';
import { newId } from '@/lib/ids';

export async function startRun(agent: string, trigger: string): Promise<AgentRun> {
  const rows = await getDb()
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
