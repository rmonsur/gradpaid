import { describe, it, expect } from 'vitest';
import { parseToolResult } from '@/lib/paypal/results';

describe('parseToolResult', () => {
  it('parses a JSON string tool result into an object', () => {
    const out = parseToolResult('{"id":"5O190127TN364715T","status":"COMPLETED"}');
    expect(out).toEqual({ id: '5O190127TN364715T', status: 'COMPLETED' });
  });

  it('passes an object tool result through unchanged', () => {
    const out = parseToolResult({ id: 'INV2-ABCD', status: 'SENT' });
    expect(out).toEqual({ id: 'INV2-ABCD', status: 'SENT' });
  });

  it('returns an empty object for an unparseable string or a non-object value', () => {
    expect(parseToolResult('not json {')).toEqual({});
    expect(parseToolResult('"just a string"')).toEqual({});
    expect(parseToolResult(null)).toEqual({});
    expect(parseToolResult(undefined)).toEqual({});
  });
});
