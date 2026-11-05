import type { PayPalAgentToolkit } from '@paypal/agent-toolkit/ai-sdk';
import { paypalRest } from './rest';
import { parsePayPalAmount, DEFAULT_CURRENCY } from '@/lib/money';

interface BalancesResponse {
  readonly balances?: readonly {
    readonly currency?: string;
    readonly available_balance?: { readonly value?: string };
  }[];
  readonly as_of_time?: string;
}

export interface PlatformBalance {
  readonly availableCents: number;
  readonly asOf: string | null;
}

/** The platform account's own balance as PayPal reports it (Reporting > Balances). */
export async function getPlatformBalance(toolkit: PayPalAgentToolkit): Promise<PlatformBalance> {
  const res = await paypalRest<BalancesResponse>(toolkit, {
    method: 'GET',
    path: `/v1/reporting/balances?currency_code=${DEFAULT_CURRENCY}`,
  });
  const usd = res.balances?.find((b) => b.currency === DEFAULT_CURRENCY);
  return {
    availableCents: parsePayPalAmount(usd?.available_balance?.value ?? '0'),
    asOf: res.as_of_time ?? null,
  };
}
