import { listLedger } from '@/features/ledger/service';
import { listRuns } from '@/features/runs/service';
import type { LedgerEntry } from '@/db/schema';
import { summarizeFlows, type FlowSummary } from './flows';

const RECENT_MOVEMENTS = 8;

export interface LiveSnapshot {
  readonly flows: FlowSummary;
  readonly movements: readonly Pick<
    LedgerEntry,
    'id' | 'kind' | 'amountCents' | 'counterparty' | 'paypalRef' | 'memo' | 'createdAt'
  >[];
  readonly agent: {
    readonly name: string;
    readonly status: string;
    readonly startedAt: Date;
  } | null;
}

export async function getLiveSnapshot(): Promise<LiveSnapshot> {
  const ledger = await listLedger();
  const [lastRun] = await listRuns(1);
  return {
    flows: summarizeFlows(ledger),
    movements: ledger.slice(0, RECENT_MOVEMENTS).map((e) => ({
      id: e.id,
      kind: e.kind,
      amountCents: e.amountCents,
      counterparty: e.counterparty,
      paypalRef: e.paypalRef,
      memo: e.memo,
      createdAt: e.createdAt,
    })),
    agent: lastRun
      ? { name: lastRun.agent, status: lastRun.status, startedAt: lastRun.startedAt }
      : null,
  };
}
