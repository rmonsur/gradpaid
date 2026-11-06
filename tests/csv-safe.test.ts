import { describe, it, expect } from 'vitest';
import { csvSafe } from '@/lib/csv-safe';

describe('csvSafe', () => {
  it('neutralises values a spreadsheet would run as a formula', () => {
    expect(csvSafe('=HYPERLINK("http://x")')).toBe(`'=HYPERLINK("http://x")`);
    expect(csvSafe('+1+1')).toBe(`'+1+1`);
    expect(csvSafe('-2')).toBe(`'-2`);
    expect(csvSafe('@SUM(A1)')).toBe(`'@SUM(A1)`);
    expect(csvSafe('\tcmd')).toBe(`'\tcmd`);
  });

  it('catches triggers hidden behind leading spaces or invisible characters, and DDE pipes', () => {
    expect(csvSafe('  =1+1')).toBe(`'  =1+1`);
    expect(csvSafe('\uFEFF=1+1')).toBe(`'\uFEFF=1+1`);
    expect(csvSafe('|cmd')).toBe(`'|cmd`);
    expect(csvSafe('%0A=1')).toBe(`'%0A=1`);
  });

  it('leaves ordinary text and numbers alone', () => {
    expect(csvSafe('Demo Donor')).toBe('Demo Donor');
    expect(csvSafe(6000)).toBe(6000);
    expect(csvSafe(null)).toBeNull();
  });
});
