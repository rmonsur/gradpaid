'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import type { ApiEnvelope } from '@/lib/envelope';

const SDK_URL = 'https://www.sandbox.paypal.com/web-sdk/v6/core';
const SDK_SCRIPT_ID = 'paypal-web-sdk-v6';

type Phase =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly session: PayPalV6PaymentSession }
  | { readonly kind: 'paying' }
  | { readonly kind: 'captured'; readonly captureId: string }
  | { readonly kind: 'error'; readonly message: string };

function loadSdk(): Promise<PayPalV6Namespace> {
  return new Promise((resolve, reject) => {
    if (window.paypal) {
      resolve(window.paypal);
      return;
    }
    const existing = document.getElementById(SDK_SCRIPT_ID);
    const script =
      existing instanceof HTMLScriptElement ? existing : document.createElement('script');
    const onLoad = (): void => {
      if (window.paypal) {
        resolve(window.paypal);
      } else {
        reject(new Error('PayPal SDK loaded but window.paypal is missing'));
      }
    };
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', () => reject(new Error('PayPal SDK failed to load')), {
      once: true,
    });
    if (!existing) {
      script.id = SDK_SCRIPT_ID;
      script.src = SDK_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

async function fetchClientToken(): Promise<string> {
  const res = await fetch('/api/paypal/client-token');
  const body = (await res.json()) as ApiEnvelope<{ accessToken: string }>;
  if (!res.ok || !body.success || !body.data) {
    throw new Error(body.error ?? 'Could not get a PayPal client token');
  }
  return body.data.accessToken;
}

async function captureOrder(orderId: string): Promise<string> {
  const res = await fetch('/api/checkout/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  });
  const body = (await res.json()) as ApiEnvelope<{ captureId: string | null }>;
  if (!res.ok || !body.success || !body.data?.captureId) {
    throw new Error(body.error ?? 'Capture failed');
  }
  return body.data.captureId;
}

export function PayPalButton({
  orderId,
  amountLabel,
}: {
  orderId: string;
  amountLabel: string;
}): React.ReactElement {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const setup = async (): Promise<void> => {
      try {
        const [paypal, clientToken] = await Promise.all([loadSdk(), fetchClientToken()]);
        const instance = await paypal.createInstance({
          clientToken,
          components: ['paypal-payments'],
          pageType: 'checkout',
        });
        const session = instance.createPayPalOneTimePaymentSession({
          onApprove: async (data): Promise<void> => {
            setPhase({ kind: 'paying' });
            try {
              const captureId = await captureOrder(data.orderId);
              setPhase({ kind: 'captured', captureId });
            } catch (err) {
              setPhase({
                kind: 'error',
                message: err instanceof Error ? err.message : 'Capture failed',
              });
            }
          },
          onCancel: (): void => setPhase({ kind: 'ready', session }),
          onError: (err): void =>
            setPhase({
              kind: 'error',
              message: err instanceof Error ? err.message : 'PayPal reported an error',
            }),
        });
        if (!cancelled) {
          setPhase({ kind: 'ready', session });
        }
      } catch (err) {
        if (!cancelled) {
          setPhase({
            kind: 'error',
            message: err instanceof Error ? err.message : 'PayPal is unavailable',
          });
        }
      }
    };
    void setup();
    return (): void => {
      cancelled = true;
    };
  }, [orderId]);

  const start = useCallback(async (): Promise<void> => {
    if (phase.kind !== 'ready') {
      return;
    }
    setPhase({ kind: 'paying' });
    try {
      await phase.session.start({ presentationMode: 'auto' }, Promise.resolve({ orderId }));
    } catch (err) {
      setPhase({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not start PayPal checkout',
      });
    }
  }, [phase, orderId]);

  if (phase.kind === 'captured') {
    return (
      <div className="space-y-2 rounded-[var(--radius-control)] border border-accent/40 bg-success-soft p-4 text-sm text-foreground">
        <div className="label text-accent">Donation captured</div>
        <div>
          PayPal capture <code className="font-mono">{phase.captureId}</code>. The disbursement
          agent will pay the servicer on its next run.
        </div>
        <Link href={`/proof?ref=${phase.captureId}`} className="font-medium text-accent underline">
          Follow this gift to the loan servicer
        </Link>
      </div>
    );
  }
  if (phase.kind === 'error') {
    return (
      <div className="space-y-2 rounded-[var(--radius-control)] border border-danger/40 bg-danger-soft p-4 text-sm text-danger">
        <div className="label text-danger">PayPal checkout could not start</div>
        <div>{phase.message}</div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Button onClick={() => void start()} disabled={phase.kind !== 'ready'} className="w-full">
        {phase.kind === 'loading'
          ? 'Preparing PayPal'
          : phase.kind === 'paying'
            ? 'Completing with PayPal'
            : `Pay ${amountLabel} with PayPal`}
      </Button>
      <p className="label text-center normal-case tracking-normal">
        Sandbox order <code className="font-mono text-foreground">{orderId}</code>
      </p>
    </div>
  );
}
