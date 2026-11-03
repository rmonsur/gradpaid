import { pgTable, text, integer, timestamp, jsonb, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { campaigns } from './campaigns';

export const disbursementStatusEnum = pgEnum('disbursement_status', [
  'planned',
  'sent',
  'success',
  'failed',
]);

export const ledgerKindEnum = pgEnum('ledger_kind', [
  'donation_captured',
  'sponsor_invoiced',
  'sponsor_paid',
  'servicer_payout',
  'refund',
  'reconciled',
  'exception',
]);

export const agentRunStatusEnum = pgEnum('agent_run_status', ['running', 'success', 'failed']);

export const disbursements = pgTable('disbursements', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id')
    .notNull()
    .references(() => campaigns.id),
  amountCents: integer('amount_cents').notNull(),
  paypalPayoutBatchId: text('paypal_payout_batch_id'),
  paypalPayoutItemId: text('paypal_payout_item_id'),
  status: disbursementStatusEnum('status').notNull().default('planned'),
  agentRunId: text('agent_run_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only. Corrections are new rows that reference the original via relatedEntryId. */
export const ledgerEntries = pgTable('ledger_entries', {
  id: text('id').primaryKey(),
  kind: ledgerKindEnum('kind').notNull(),
  campaignId: text('campaign_id'),
  amountCents: integer('amount_cents').notNull(),
  counterparty: text('counterparty').notNull(),
  paypalRef: text('paypal_ref'),
  agentRunId: text('agent_run_id'),
  relatedEntryId: text('related_entry_id'),
  memo: text('memo').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export interface ToolCallRecord {
  readonly tool: string;
  readonly input: unknown;
  readonly output: unknown;
  readonly durationMs: number;
  readonly ok: boolean;
}

export const agentRuns = pgTable(
  'agent_runs',
  {
    id: text('id').primaryKey(),
    agent: text('agent').notNull(),
    trigger: text('trigger').notNull(),
    status: agentRunStatusEnum('status').notNull().default('running'),
    summary: text('summary'),
    toolCalls: jsonb('tool_calls').$type<readonly ToolCallRecord[]>().notNull().default([]),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (t) => [
    /** The database, not application code, guarantees one live run per agent. */
    uniqueIndex('agent_runs_one_running')
      .on(t.agent)
      .where(sql`${t.status} = 'running'`),
  ],
);

export const reconciliationExceptions = pgTable('reconciliation_exceptions', {
  id: text('id').primaryKey(),
  agentRunId: text('agent_run_id').notNull(),
  paypalRef: text('paypal_ref'),
  expectedCents: integer('expected_cents'),
  actualCents: integer('actual_cents'),
  detail: text('detail').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Disbursement = typeof disbursements.$inferSelect;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type AgentRun = typeof agentRuns.$inferSelect;
export type ReconciliationException = typeof reconciliationExceptions.$inferSelect;
