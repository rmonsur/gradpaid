const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** Prefixes a quote so spreadsheets show a value as text instead of running it as a formula. */
export function csvSafe<T>(value: T): T | string {
  return typeof value === 'string' && FORMULA_PREFIX.test(value) ? `'${value}` : value;
}
