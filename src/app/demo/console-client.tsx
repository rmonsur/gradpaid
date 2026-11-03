'use client';

import { useState } from 'react';
import type { ToolCallRecord } from '@/db/schema';
import { apiFetch, bearer } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';
import { ActivityPanel } from '@/components/activity-panel';
import { HealthSection } from './health-section';
import { RunsSection, toActivityItems } from './runs-section';

interface ResetResult {
  readonly campaignIds: readonly string[];
}

interface DisburseResult {
  readonly runId: string;
  readonly summary: string;
  readonly toolCalls: readonly ToolCallRecord[];
  readonly dryRun: boolean;
}

type ActionState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'running' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'done'; readonly result: T };

const UNAUTHORIZED = 401;

function describeError(status: number, error: string | null): string {
  return status === UNAUTHORIZED ? 'Wrong demo token' : (error ?? 'Request failed');
}

export function ConsoleClient(): React.ReactElement {
  const [token, setToken] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [reset, setReset] = useState<ActionState<ResetResult>>({ status: 'idle' });
  const [disburse, setDisburse] = useState<ActionState<DisburseResult>>({ status: 'idle' });
  const [refreshKey, setRefreshKey] = useState(0);

  const hasToken = token.trim().length > 0;

  async function onReset(): Promise<void> {
    setReset({ status: 'running' });
    const res = await apiFetch<ResetResult>('/api/demo/reset', {
      method: 'POST',
      headers: bearer(token),
    });
    if (res.ok && res.data) {
      setReset({ status: 'done', result: res.data });
      setRefreshKey((k) => k + 1);
    } else {
      setReset({ status: 'error', message: describeError(res.status, res.error) });
    }
  }

  async function onDisburse(): Promise<void> {
    setDisburse({ status: 'running' });
    const res = await apiFetch<DisburseResult>('/api/disburse', {
      method: 'POST',
      headers: bearer(token),
      body: JSON.stringify({ dryRun, trigger: 'console' }),
    });
    if (res.ok && res.data) {
      setDisburse({ status: 'done', result: res.data });
    } else {
      setDisburse({ status: 'error', message: describeError(res.status, res.error) });
    }
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="flex flex-col gap-6">
        <HealthSection />

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Demo controls</h2>
          <label className="block text-xs font-medium text-muted" htmlFor="demo-token">
            Demo token
          </label>
          <input
            id="demo-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <p className="mt-1 text-xs text-muted">Found on the demo page in the README.</p>

          <div className="mt-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => void onReset()}
                disabled={!hasToken || reset.status === 'running'}
              >
                {reset.status === 'running' ? 'Resetting...' : 'Reset demo data'}
              </Button>
              <span className="text-xs text-muted">
                Reseeds three verified campaigns and one matching sponsor.
              </span>
            </div>
            {reset.status === 'error' ? (
              <p className="text-sm text-danger">{reset.message}</p>
            ) : null}
            {reset.status === 'done' ? (
              <p className="text-xs text-muted">
                Seeded campaigns:{' '}
                <code className="font-mono">{reset.result.campaignIds.join(', ')}</code>
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => void onDisburse()}
                disabled={!hasToken || disburse.status === 'running'}
              >
                {disburse.status === 'running' ? (
                  <>
                    <span
                      className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white"
                      aria-hidden
                    />
                    Agent running
                  </>
                ) : (
                  'Run disbursement agent'
                )}
              </Button>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                />
                Dry run (no payouts sent)
              </label>
            </div>
            {disburse.status === 'error' ? (
              <p className="text-sm text-danger">{disburse.message}</p>
            ) : null}
          </div>
        </Card>

        <RunsSection refreshKey={refreshKey} token={hasToken ? token.trim() : undefined} />
      </div>

      <div className="flex flex-col gap-4">
        {disburse.status === 'done' ? (
          <Card>
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
              Run {disburse.result.runId} {disburse.result.dryRun ? '(dry run)' : ''}
            </div>
            <p className="text-sm">{disburse.result.summary}</p>
          </Card>
        ) : null}
        <ActivityPanel
          title="Disbursement agent activity"
          items={
            disburse.status === 'done'
              ? toActivityItems(disburse.result.runId, disburse.result.toolCalls)
              : []
          }
        />
      </div>
    </div>
  );
}
