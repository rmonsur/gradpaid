'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui';

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
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-raised"
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${item.state === 'running' ? 'animate-pulse-dot bg-accent' : item.state === 'ok' ? 'bg-success' : 'bg-danger'}`}
          aria-hidden
        />
        <code className="font-mono text-sm text-foreground">{item.tool}</code>
        {isPayPal ? <Badge tone="accent">PayPal Agent Toolkit</Badge> : null}
        <span className="ml-auto flex items-center gap-3 text-xs text-muted">
          {ref ? <code className="font-mono">{ref}</code> : null}
          {item.durationMs !== undefined ? <span>{item.durationMs} ms</span> : null}
        </span>
      </button>
      {open ? (
        <div className="grid gap-3 border-t border-border bg-background px-4 pb-4 pt-3 text-xs md:grid-cols-2">
          <div>
            <div className="label mb-2">Request</div>
            <pre className="max-h-56 overflow-auto rounded-[var(--radius-control)] border border-border bg-surface p-3 font-mono text-muted">
              {pretty(item.input)}
            </pre>
          </div>
          <div>
            <div className="label mb-2">Response</div>
            <pre className="max-h-56 overflow-auto rounded-[var(--radius-control)] border border-border bg-surface p-3 font-mono text-muted">
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
    <section className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="label text-foreground">{title}</h2>
        <span className="label">{items.length} tool calls</span>
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
