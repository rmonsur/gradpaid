'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';

interface HealthCheck {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
}

interface HealthPayload {
  readonly healthy: boolean;
  readonly checks: readonly HealthCheck[];
  readonly at: string;
}

type HealthState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly payload: HealthPayload };

const CHECK_LABELS: Record<string, string> = {
  env: 'Environment',
  database: 'Postgres',
  paypal_sandbox: 'PayPal sandbox',
  elastic: 'Elastic search',
  last_agent_run: 'Last agent run',
};

async function fetchHealth(): Promise<HealthState> {
  const res = await apiFetch<HealthPayload>('/api/health');
  return res.data
    ? { status: 'ready', payload: res.data }
    : { status: 'error', message: res.error ?? 'Health endpoint unreachable' };
}

export function HealthSection(): React.ReactElement {
  const [state, setState] = useState<HealthState>({ status: 'loading' });

  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    void fetchHealth().then((next) => {
      if (active) {
        setState(next);
      }
    });
    return (): void => {
      active = false;
    };
  }, [tick]);

  const refresh = useCallback((): void => {
    setState({ status: 'loading' });
    setTick((t) => t + 1);
  }, []);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">System health</h2>
        <div className="flex items-center gap-3">
          {state.status === 'ready' ? (
            <span
              className={`text-xs font-medium ${state.payload.healthy ? 'text-success' : 'text-danger'}`}
            >
              {state.payload.healthy ? 'All systems go' : 'Attention needed'}
            </span>
          ) : null}
          <Button variant="secondary" onClick={refresh} disabled={state.status === 'loading'}>
            Refresh
          </Button>
        </div>
      </div>
      {state.status === 'loading' ? <p className="text-sm text-muted">Checking...</p> : null}
      {state.status === 'error' ? <p className="text-sm text-danger">{state.message}</p> : null}
      {state.status === 'ready' ? (
        <ul className="divide-y divide-border">
          {state.payload.checks.map((c) => (
            <li key={c.name} className="flex items-center gap-3 py-2 text-sm">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.ok ? 'bg-success' : 'bg-danger'}`}
                aria-hidden
              />
              <span className="w-36 font-medium">{CHECK_LABELS[c.name] ?? c.name}</span>
              <span className="truncate text-muted">{c.detail}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
