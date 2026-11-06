import { config } from 'dotenv';
import { createPayPalToolkit } from '@/lib/paypal/toolkit';
import { paypalRest } from '@/lib/paypal/rest';
import { HANDLED_WEBHOOK_EVENTS } from '@/lib/paypal/webhook-action';

config({ path: '.env.local' });

interface Webhook {
  readonly id: string;
  readonly url: string;
}

/** Registers (or finds) the sandbox webhook for the hosted app and prints its id. */
async function main(): Promise<void> {
  const url = process.argv[2];
  if (!url?.startsWith('https://')) {
    throw new Error('Usage: pnpm webhook:register https://<host>/api/webhooks/paypal');
  }
  const { toolkit } = createPayPalToolkit({});
  const existing = await paypalRest<{ webhooks?: readonly Webhook[] }>(toolkit, {
    method: 'GET',
    path: '/v1/notifications/webhooks',
  });
  const found = existing.webhooks?.find((w) => w.url === url);
  const hook =
    found ??
    (await paypalRest<Webhook>(toolkit, {
      method: 'POST',
      path: '/v1/notifications/webhooks',
      body: { url, event_types: HANDLED_WEBHOOK_EVENTS.map((name) => ({ name })) },
    }));
  process.stdout.write(`${hook.id}\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
