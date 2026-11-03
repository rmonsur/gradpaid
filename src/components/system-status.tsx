import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import { sql } from 'drizzle-orm';

const STATUS_LABEL = 'System status';

async function isOptimal(): Promise<boolean> {
  try {
    getEnv();
    await getDb().execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

/** Live readout of the platform state, read on the server at render time. */
export async function SystemStatus(): Promise<React.ReactElement> {
  const optimal = await isOptimal();
  return (
    <div className="flex flex-col gap-2">
      <div className="label">{STATUS_LABEL}</div>
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${optimal ? 'bg-accent' : 'bg-danger'}`}
          aria-hidden
        />
        <span className="display text-2xl normal-case tracking-tight">
          {optimal ? 'Optimal' : 'Degraded'}
        </span>
      </div>
      <div className="text-xs text-muted">PayPal sandbox. No real money moves.</div>
    </div>
  );
}
