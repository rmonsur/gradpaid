import { describe, it, expect } from 'vitest';
import { isPublicHost } from '@/lib/paypal/client-token';

describe('isPublicHost', () => {
  it('treats the deployed hostname as public', () => {
    expect(isPublicHost('gradpaid.onrender.com')).toBe(true);
  });

  it('does not treat loopback or local development hosts as public', () => {
    expect(isPublicHost('localhost')).toBe(false);
    expect(isPublicHost('127.0.0.1')).toBe(false);
    expect(isPublicHost('[::1]')).toBe(false);
    expect(isPublicHost('app.localhost')).toBe(false);
    expect(isPublicHost('gradpaid.test')).toBe(false);
  });
});
