'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AgentRun, ToolCallRecord } from '@/db/schema';
import { apiFetch, bearer } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';
import { ActivityPanel, type ActivityItem } from '@/components/activity-panel';

export function toActivityItems(
  runId: string,
  calls: readonly ToolCallRecord[],
): readonly ActivityItem[] {
  return calls.map((c, i) => ({
    id: `${runId}-${i}`,
    tool: c.tool,
    input: c.input,
    output: c.output,
    state: c.ok ? 'ok' : 'error',
    durationMs: c.durationMs,
  }));
}

const STATUS_TONES: Record<AgentRun['status'], 'accent' | 'success' | 'danger'> = {
  running: 'accent',
  success: 'success',
  failed: 'danger',
};

function formatWhen(value: Date | string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RunsSection({
  refreshKey,
  token,
}: {
  refreshKey: number;
  token?: string;
}): React.ReactElement {
  const [runs, setRuns] = useState<readonly AgentRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    const init = token ? { headers: bearer(token) } : undefined;
    void apiFetch<AgentRun[]>('/api/runs', init).then((res) => {
      if (!active) {
        return;
      }
      if (res.ok && res.data) {
        setRuns(res.data);
        setError(null);
      } else {
        setError(res.error ?? 'Could not load runs');
      }
    });
    return (): void => {
      active = false;
    };
  }, [refreshKey, tick, token]);

  const load = useCallback((): void => {
    setTick((t) => t + 1);
  }, []);

  const selected = runs.find((r) => r.id === selectedId);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="label text-foreground">Recent agent runs</h2>
          <Button variant="ghost" onClick={load}>
            Refresh
          </Button>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {!error && runs.length === 0 ? <p className="text-sm text-muted">No runs yet.</p> : null}
        <ul className="divide-y divide-border">
          {runs.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                className={`flex w-full flex-wrap items-center gap-3 px-2 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-surface-raised ${r.id === selectedId ? 'bg-surface-raised' : ''}`}
              >
                <Badge tone={STATUS_TONES[r.status]}>{r.status}</Badge>
                <span className="text-foreground">{r.agent}</span>
                <span className="text-muted">via {r.trigger}</span>
                <span className="ml-auto text-xs text-muted">{formatWhen(r.startedAt)}</span>
                {r.summary ? (
                  <span className="w-full truncate text-xs text-muted">{r.summary}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </Card>
      {selected ? (
        <ActivityPanel
          title={`Run ${selected.id}`}
          items={toActivityItems(selected.id, selected.toolCalls)}
        />
      ) : null}
    </div>
  );
}
