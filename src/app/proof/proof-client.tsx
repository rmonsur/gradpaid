'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api-client';
import { formatUsd } from '@/lib/money';
import { formatWhen } from '@/lib/format';
import { Badge, Button, Card } from '@/components/ui';
import type { ProofTrace } from '@/features/proof/service';

interface ProofResponse {
  readonly trace: ProofTrace;
  readonly paypalPayoutStatus: Record<string, string>;
}

type State =
  | { readonly status: 'idle'; readonly recent: readonly string[] }
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly result: ProofResponse };

const STATUS_TONES = {
  waiting: 'neutral',
  planned: 'neutral',
  sent: 'accent',
  success: 'success',
  failed: 'danger',
} as const;

export function ProofClient({ initialRef }: { readonly initialRef: string }): React.ReactElement {
  const [ref, setRef] = useState(initialRef);
  const [state, setState] = useState<State>(
    initialRef ? { status: 'loading' } : { status: 'idle', recent: [] },
  );

  const fetchTrace = useCallback((value: string): Promise<void> => {
    return apiFetch<ProofResponse>(`/api/proof?ref=${encodeURIComponent(value)}`).then((res) =>
      setState(
        res.ok && res.data
          ? { status: 'ready', result: res.data }
          : { status: 'error', message: res.error ?? 'Lookup failed' },
      ),
    );
  }, []);

  const lookup = (value: string): void => {
    setState({ status: 'loading' });
    void fetchTrace(value);
  };

  useEffect(() => {
    if (initialRef) {
      void fetchTrace(initialRef);
      return;
    }
    void apiFetch<{ recent: string[] }>('/api/proof').then((res) =>
      setState({ status: 'idle', recent: res.data?.recent ?? [] }),
    );
  }, [initialRef, fetchTrace]);

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (ref.trim()) {
      lookup(ref.trim());
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} className="flex gap-3">
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="PayPal order, capture or payout batch id"
          aria-label="PayPal reference"
          className="flex-1 rounded-[var(--radius-control)] border border-border bg-surface px-4 py-3 font-mono text-sm outline-none placeholder:text-muted focus:border-accent"
        />
        <Button type="submit" disabled={state.status === 'loading'}>
          Trace
        </Button>
      </form>
      {state.status === 'idle' && state.recent.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          Try a recent capture:
          {state.recent.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRef(r);
                lookup(r);
              }}
              className="font-mono text-accent hover:underline"
            >
              {r}
            </button>
          ))}
        </div>
      ) : null}
      {state.status === 'error' ? (
        <Card className="text-sm text-danger">{state.message}</Card>
      ) : null}
      {state.status === 'ready' ? <TraceView result={state.result} /> : null}
    </div>
  );
}

function TraceView({ result }: { readonly result: ProofResponse }): React.ReactElement {
  const { donation, legs } = result.trace;
  return (
    <div className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border">
      <div className="bg-surface p-6">
        <div className="label mb-3">1 / Donation captured by PayPal Orders</div>
        <div className="display text-3xl normal-case text-accent">
          {formatUsd(donation.totalCents)}
        </div>
        <p className="mt-2 text-sm text-muted">
          From {donation.donorName}
          {donation.capturedAt ? `, ${formatWhen(donation.capturedAt)}` : ''}. Order{' '}
          <code className="text-foreground">{donation.paypalOrderId}</code>, capture{' '}
          <code className="text-foreground">{donation.paypalCaptureId ?? 'pending'}</code>.
        </p>
      </div>
      {legs.map((leg, i) => (
        <div key={leg.campaignId} className="bg-surface p-6">
          <div className="label mb-3">
            {i + 2} / {formatUsd(leg.cents)} to {leg.servicerName} for loan {leg.loanRefMasked}
          </div>
          <p className="text-sm">{leg.campaignTitle}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
            <Badge tone={STATUS_TONES[leg.payoutStatus]}>{leg.payoutStatus}</Badge>
            {leg.payoutBatchId ? (
              <span>
                PayPal Payouts batch <code className="text-foreground">{leg.payoutBatchId}</code>,
                PayPal says{' '}
                <span className="text-foreground">
                  {result.paypalPayoutStatus[leg.payoutBatchId] ?? 'unknown'}
                </span>
              </span>
            ) : (
              <span>Waiting for the next disbursement agent run.</span>
            )}
          </div>
        </div>
      ))}
      <div className="bg-surface p-6 text-sm text-muted">
        The borrower appears nowhere on this path. Every amount above is read from the ledger and
        every payout status is read live from PayPal.
      </div>
    </div>
  );
}
