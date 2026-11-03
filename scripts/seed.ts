import { config } from 'dotenv';
import { resetDemo } from '@/features/demo/seed';
import { getEnv } from '@/lib/env';

config({ path: '.env.local' });

async function main(): Promise<void> {
  const env = getEnv();
  const result = await resetDemo(env.PAYPAL_SPONSOR_EMAIL);
  process.stdout.write(`Seeded campaigns: ${result.campaignIds.join(', ')}\n`);
  process.exit(0);
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
