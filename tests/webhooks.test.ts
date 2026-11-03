import { describe, it, expect, vi, afterEach } from 'vitest';
import type { PayPalAgentToolkit } from '@paypal/agent-toolkit/ai-sdk';
import { readWebhookHeaders, verifyWebhookSignature } from '@/lib/paypal/webhooks';
import * as rest from '@/lib/paypal/rest';

const PAYPAL_HEADERS = {
  'paypal-auth-algo': 'SHA256withRSA',
  'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360caa42',
  'paypal-transmission-id': '69cd13f0-d67a-11e5-baa3-778b53f4ae55',
  'paypal-transmission-sig': 'lmI95Jx3Y9nhR5SJWlHVIWpg4AgFk7n9bCHSRxbrd8A=',
  'paypal-transmission-time': '2016-02-18T20:01:35Z',
} as const;

describe('readWebhookHeaders', () => {
  it('returns the five PayPal signature headers when all are present', () => {
    const out = readWebhookHeaders(new Headers(PAYPAL_HEADERS));
    expect(out).toEqual({
      authAlgo: 'SHA256withRSA',
      certUrl: 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360caa42',
      transmissionId: '69cd13f0-d67a-11e5-baa3-778b53f4ae55',
      transmissionSig: 'lmI95Jx3Y9nhR5SJWlHVIWpg4AgFk7n9bCHSRxbrd8A=',
      transmissionTime: '2016-02-18T20:01:35Z',
    });
  });

  it('returns null when any one of the five headers is missing', () => {
    for (const missing of Object.keys(PAYPAL_HEADERS)) {
      const partial = Object.fromEntries(
        Object.entries(PAYPAL_HEADERS).filter(([k]) => k !== missing),
      );
      expect(readWebhookHeaders(new Headers(partial)), `missing ${missing}`).toBeNull();
    }
  });
});

describe('verifyWebhookSignature', () => {
  const toolkit = {} as unknown as PayPalAgentToolkit;
  const headers = {
    authAlgo: 'SHA256withRSA',
    certUrl: 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360caa42',
    transmissionId: '69cd13f0-d67a-11e5-baa3-778b53f4ae55',
    transmissionSig: 'lmI95Jx3Y9nhR5SJWlHVIWpg4AgFk7n9bCHSRxbrd8A=',
    transmissionTime: '2016-02-18T20:01:35Z',
  };
  const event = {
    id: 'WH-2WR32451HC0233532-67976317FL4543714',
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when PayPal reports SUCCESS', async () => {
    vi.spyOn(rest, 'paypalRest').mockResolvedValue({ verification_status: 'SUCCESS' });
    await expect(verifyWebhookSignature(toolkit, 'WH-ID-1', headers, event)).resolves.toBe(true);
  });

  it('returns false for any other verification status', async () => {
    vi.spyOn(rest, 'paypalRest').mockResolvedValue({ verification_status: 'FAILURE' });
    await expect(verifyWebhookSignature(toolkit, 'WH-ID-1', headers, event)).resolves.toBe(false);
  });
});
