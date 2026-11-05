'use client';

import { useState } from 'react';
import { apiFetch, bearer } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';

type Step = 'idle' | 'resetting' | 'disbursing' | 'done' | 'error';

const STEP_TEXT: Record<Step, string> = {
  idle: 'Resets the sandbox demo with one captured $100 gift, then runs the disbursement agent for real against PayPal sandbox. Watch the board.',
  resetting: 'Seeding three verified campaigns and one captured $100 gift.',
  disbursing:
    'Agent running: planning, paying servicers by PayPal Payouts, invoicing the sponsor, reconciling.',
  done: 'Done. Every movement above carries a PayPal reference you can trace.',
  error: '',
};

/** Judge mode: the whole money path in one click, no prompt typing. */
export function StoryControl({ onTick }: { readonly onTick: () => void }): React.ReactElement {
  const [token, setToken] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState('');
  const busy = step === 'resetting' || step === 'disbursing';

  async function run(): Promise<void> {
    setError('');
    setStep('resetting');
    const reset = await apiFetch('/api/demo/reset', { method: 'POST', headers: bearer(token) });
    onTick();
    if (!reset.ok) {
      setStep('error');
      setError(reset.status === 401 ? 'Wrong demo token' : (reset.error ?? 'Reset failed'));
      return;
    }
    setStep('disbursing');
    const run = await apiFetch('/api/disburse', {
      method: 'POST',
      headers: bearer(token),
      body: JSON.stringify({ dryRun: false, trigger: 'live-board' }),
    });
    onTick();
    if (!run.ok) {
      setStep('error');
      setError(run.error ?? 'The agent run failed');
      return;
    }
    setStep('done');
  }

  return (
    <Card className="flex flex-col gap-4 md:flex-row md:items-end">
      <div className="flex-1 space-y-2">
        <h2 className="label text-foreground">Run the full story</h2>
        <p className="text-sm text-muted">{step === 'error' ? error : STEP_TEXT[step]}</p>
      </div>
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Demo token"
        aria-label="Demo token"
        autoComplete="off"
        className="rounded-[var(--radius-control)] border border-border bg-background px-4 py-3 font-mono text-sm outline-none focus:border-accent"
      />
      <Button onClick={() => void run()} disabled={busy || token.trim().length === 0}>
        {busy ? 'Money moving' : 'Run it live'}
      </Button>
    </Card>
  );
}
