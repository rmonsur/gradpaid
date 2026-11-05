import type { LiveSnapshot } from '@/features/live/service';
import type { PlatformBalance } from '@/lib/paypal/balances';

export interface LivePayload extends LiveSnapshot {
  readonly paypalPlatformBalance: PlatformBalance | null;
}
