'use client';

import { useState } from 'react';
import { Badge } from './ui';

export interface ActivityItem {
  readonly id: string;
  readonly tool: string;
  readonly input: unknown;
  readonly output?: unknown;
  readonly state: 'running' | 'ok' | 'error';
  readonly durationMs?: number;
}

/** Tool names that hit PayPal, highlighted so judges see the Agent Toolkit working. */
const PAYPAL_TOOLS = new Set([
  'create_order',
  'get_order',
  'pay_order',
  'create_invoice',
  'send_invoice',
  'get_invoice',
  'list_transactions',
  'create_refund',
  'get_refund',
  'send_payout',
  'get_payout_batch',
]);

const PAYPAL_REF_KEYS = [
  'id',
  'paypalOrderId',
  'batchId',
  'captureId',
  'invoice_id',
  'paypalInvoiceId',
];

function findRef(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const rec = value as Record<string, unknown>;
  for (const k of PAYPAL_REF_KEYS) {
    const v = rec[k];
    if (typeof v === 'string' && v.length > 0) {
      return v;
    }
  }
  return undefined;
}

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? '';
  } catch {
    return String(value);
  }
}

function Row({ item }: { item: ActivityItem }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const isPayPal = PAYPAL_TOOLS.has(item.tool);
  const ref = findRef(item.output);
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent-soft/40"
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${item.state === 'running' ? 'animate-pulse-dot bg-accent' : item.state === 'ok' ? 'bg-success' : 'bg-danger'}`}
          aria-hidden
        />
        <code className="font-mono text-sm font-medium">{item.tool}</code>
        {isPayPal ? <Badge tone="accent">PayPal Agent Toolkit</Badge> : null}
        <span className="ml-auto flex items-center gap-3 text-xs text-muted">
          {ref ? <code className="font-mono">{ref}</code> : null}
          {item.durationMs !== undefined ? <span>{item.durationMs} ms</span> : null}
        </span>
      </button>
      {open ? (
        <div className="grid gap-3 bg-background px-4 pb-4 pt-1 text-xs md:grid-cols-2">
          <div>
            <div className="mb-1 font-medium text-muted">Request</div>
            <pre className="max-h-56 overflow-auto rounded-md bg-surface p-3 font-mono">
              {pretty(item.input)}
            </pre>
          </div>
          <div>
            <div className="mb-1 font-medium text-muted">Response</div>
            <pre className="max-h-56 overflow-auto rounded-md bg-surface p-3 font-mono">
              {item.output === undefined ? 'pending' : pretty(item.output)}
            </pre>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function ActivityPanel({
  items,
  title = 'Agent activity',
}: {
  items: readonly ActivityItem[];
  title?: string;
}): React.ReactElement {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted">{items.length} tool calls</span>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">
          Every PayPal call the agent makes will appear here with its request, response, and
          reference id.
        </p>
      ) : (
        <ul>
          {items.map((it) => (
            <Row key={it.id} item={it} />
          ))}
        </ul>
      )}
    </section>
  );
}
