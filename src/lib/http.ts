import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from '@/lib/logger';
import { getEnv } from '@/lib/env';

export interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: string | null;
}

export function ok<T>(data: T, status = 200): NextResponse<ApiEnvelope<T>> {
  return NextResponse.json({ success: true, data, error: null }, { status });
}

export function fail(error: string, status: number): NextResponse<ApiEnvelope<never>> {
  return NextResponse.json({ success: false, data: null, error }, { status });
}

/** Wraps a handler so every error becomes a well-formed envelope with the right status. */
export function handle<T>(
  fn: () => Promise<NextResponse<ApiEnvelope<T>>>,
): Promise<NextResponse<ApiEnvelope<T>>> {
  return fn().catch((err: unknown) => {
    if (err instanceof ZodError) {
      return fail(
        `Invalid request: ${err.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`,
        400,
      );
    }
    logger.error({ err }, 'request failed');
    return fail('Something went wrong on our side. The error has been logged.', 500);
  }) as Promise<NextResponse<ApiEnvelope<T>>>;
}

export type InternalAuth = 'cron' | 'demo';

/** Accepts either the cron secret or the demo token as a bearer token. */
export function checkInternalAuth(req: Request, allowed: readonly InternalAuth[]): boolean {
  const env = getEnv();
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (token.length === 0) {
    return false;
  }
  return (
    (allowed.includes('cron') && token === env.CRON_SECRET) ||
    (allowed.includes('demo') && token === env.DEMO_TOKEN)
  );
}
