'use client';

import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { useMemo, useState, type FormEvent } from 'react';
import { ActivityPanel, type ActivityItem } from '@/components/activity-panel';
import { PayPalButton } from '@/components/paypal-button';
import { Button, Card } from '@/components/ui';
import { formatUsd } from '@/lib/money';

const SUGGESTIONS = [
  'Help first-gen nursing grads in Ohio',
  'Support a rural teacher',
  '$50 to whoever needs it most',
] as const;

const DEFAULT_DONOR = 'Anonymous donor';

interface PendingOrder {
  readonly paypalOrderId: string;
  readonly totalCents: number;
}

function hasErrorKey(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'error' in value;
}

function toActivity(messages: readonly UIMessage[]): readonly ActivityItem[] {
  return messages.flatMap((m) =>
    m.parts.flatMap((p): ActivityItem[] => {
      if (p.type !== 'tool-invocation') {
        return [];
      }
      const inv = p.toolInvocation;
      const done = inv.state === 'result';
      const output = done ? inv.result : undefined;
      return [
        {
          id: inv.toolCallId,
          tool: inv.toolName,
          input: inv.args,
          output,
          state: !done ? 'running' : hasErrorKey(output) ? 'error' : 'ok',
        },
      ];
    }),
  );
}

function findPendingOrder(messages: readonly UIMessage[]): PendingOrder | undefined {
  const orders = messages.flatMap((m) =>
    m.parts.flatMap((p): PendingOrder[] => {
      if (p.type !== 'tool-invocation' || p.toolInvocation.toolName !== 'record_donation_order') {
        return [];
      }
      if (p.toolInvocation.state !== 'result') {
        return [];
      }
      const r: unknown = p.toolInvocation.result;
      if (typeof r !== 'object' || r === null) {
        return [];
      }
      const rec = r as Record<string, unknown>;
      if (typeof rec.paypalOrderId !== 'string' || typeof rec.totalCents !== 'number') {
        return [];
      }
      return [{ paypalOrderId: rec.paypalOrderId, totalCents: rec.totalCents }];
    }),
  );
  return orders[orders.length - 1];
}

function MessageBubble({ m }: { m: UIMessage }): React.ReactElement | null {
  const text = m.parts
    .filter((p): p is Extract<UIMessage['parts'][number], { type: 'text' }> => p.type === 'text')
    .map((p) => p.text)
    .join('');
  if (text.trim().length === 0) {
    return null;
  }
  const mine = m.role === 'user';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
          mine ? 'bg-accent-strong text-white' : 'bg-accent-soft text-foreground'
        }`}
      >
        {text}
      </div>
    </div>
  );
}

export function GiveClient(): React.ReactElement {
  const [donorName, setDonorName] = useState(DEFAULT_DONOR);
  const { messages, input, setInput, handleInputChange, handleSubmit, status, error, append } =
    useChat({
      api: '/api/chat/give',
      body: { donorName },
    });
  const activity = useMemo(() => toActivity(messages), [messages]);
  const pending = useMemo(() => findPendingOrder(messages), [messages]);
  const busy = status === 'submitted' || status === 'streaming';

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (input.trim().length === 0 || busy) {
      return;
    }
    handleSubmit(e);
  };

  const suggest = (text: string): void => {
    setInput('');
    void append({ role: 'user', content: text });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Card className="flex min-h-[560px] flex-col gap-4">
        <label className="flex items-center gap-2 text-xs text-muted">
          Your name
          <input
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            maxLength={80}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
          />
        </label>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="space-y-3 text-sm text-muted">
              <p>Start with who you want to help, or pick one:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} variant="secondary" onClick={() => suggest(s)} disabled={busy}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          {messages.map((m) => (
            <MessageBubble key={m.id} m={m} />
          ))}
          {busy ? <div className="text-xs text-muted">The agent is working</div> : null}
          {error ? (
            <div className="rounded-md bg-danger-soft p-3 text-sm text-danger">{error.message}</div>
          ) : null}
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Who do you want to help, and how much?"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={busy || input.trim().length === 0}>
            Send
          </Button>
        </form>
      </Card>
      <div className="space-y-4">
        <ActivityPanel items={activity} />
        {pending ? (
          <Card className="space-y-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted">
                Ready to pay
              </div>
              <div className="text-2xl font-semibold">{formatUsd(pending.totalCents)}</div>
              <p className="text-sm text-muted">
                Captured by PayPal, then paid to the servicer by the disbursement agent.
              </p>
            </div>
            <PayPalButton
              orderId={pending.paypalOrderId}
              amountLabel={formatUsd(pending.totalCents)}
            />
          </Card>
        ) : null}
      </div>
    </div>
  );
}
