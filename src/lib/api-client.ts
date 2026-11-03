import type { ApiEnvelope } from '@/lib/http';

export interface ApiResult<T> {
  readonly ok: boolean;
  readonly status: number;
  readonly data: T | null;
  readonly error: string | null;
}

/** Browser-side fetch helper that always resolves to a typed envelope, never throws on HTTP errors. */
export async function apiFetch<T>(input: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(input, { ...init, cache: 'no-store' });
    const body = (await res.json()) as ApiEnvelope<T>;
    return { ok: res.ok && body.success, status: res.status, data: body.data, error: body.error };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

export function bearer(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}
