import { getEnv } from '@/lib/env';

const SANDBOX_OAUTH_URL = 'https://api-m.sandbox.paypal.com/v1/oauth2/token';
const TOKEN_SAFETY_MS = 60_000;

interface TokenResponse {
  readonly access_token: string;
  readonly expires_in: number;
}

let cached: { token: string; expiresAt: number } | undefined;

/** PayPal rejects localhost and bare IPs as token domains, so those are left unscoped. */
function isPublicHost(host: string): boolean {
  return host.includes('.') && host !== '127.0.0.1' && !host.endsWith('.localhost');
}

/**
 * Browser-safe client token for the PayPal JS SDK v6. Scoped to this app's domain,
 * cached until shortly before expiry.
 */
export async function getBrowserClientToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }
  const env = getEnv();
  const basic = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString(
    'base64',
  );
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    response_type: 'client_token',
  });
  const host = new URL(env.NEXT_PUBLIC_APP_URL).hostname;
  if (isPublicHost(host)) {
    body.set('domains[]', host);
  }
  const res = await fetch(SANDBOX_OAUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`PayPal client token request failed with status ${res.status}`);
  }
  const data = (await res.json()) as TokenResponse;
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - TOKEN_SAFETY_MS,
  };
  return data.access_token;
}
