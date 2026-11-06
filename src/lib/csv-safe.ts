/** Characters spreadsheets skip before evaluating: whitespace, controls, zero-width marks, BOM. */
const IGNORED_LEADERS = '[\\s\\u0000-\\u001f\\u200b-\\u200d\\u2060\\ufeff]*';

/** A leading tab or CR, or a formula trigger (= + - @ | %) hidden behind ignored leaders. */
const FORMULA_PREFIX = new RegExp(`^(?:[\\t\\r]|${IGNORED_LEADERS}[=+\\-@|%])`);

/** Prefixes a quote so spreadsheets show a value as text instead of running it as a formula. */
export function csvSafe<T>(value: T): T | string {
  return typeof value === 'string' && FORMULA_PREFIX.test(value) ? `'${value}` : value;
}
