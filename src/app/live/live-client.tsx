'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Badge, Card } from '@/components/ui';
import { MoneyBoard } from './money-board';
import { MovementFeed } from './movement-feed';
import { StoryControl } from './story-control';
import type { LivePayload } from './types';

const POLL_MS = 1_500;

export function LiveClient(): React.ReactElement {
  const [data, setData] = useState<LivePayload | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback((): Promise<void> => {
    return apiFetch<LivePayload>('/api/live').then((res) => {
      if (res.ok && res.data) {
        setData(res.data);
        setFailed(false);
      } else {
        setFailed(true);
      }
    });
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), POLL_MS);
    return (): void => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  const running = data?.agent?.status === 'running';
  return (
    <div className="flex flex-col gap-6">
      <StoryControl onTick={() => void load()} />
      <div className="flex items-center gap-3">
        <Badge tone={running ? 'accent' : 'neutral'} live={running}>
          {running
            ? data?.agent?.name.startsWith('sponsor')
              ? 'Sponsor agent reviewing its invoice'
              : 'Disbursement agent running'
            : 'Agents idle'}
        </Badge>
        {failed ? (
          <span className="text-xs text-danger">Live data unavailable, retrying</span>
        ) : null}
      </div>
      {data ? (
        <>
          <MoneyBoard data={data} />
          <MovementFeed movements={data.movements} />
        </>
      ) : (
        <Card className="text-sm text-muted">Loading the board.</Card>
      )}
    </div>
  );
}
