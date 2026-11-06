/**
 * A leading tab or carriage return, or a formula trigger (= + - @ | %) after any run of
 * whitespace, control or invisible characters, which spreadsheets skip before evaluating.
 */
const FORMULA_PREFIX = /^[\s\u0000-\u001f​-‍⁠﻿]*[=+\-@|%]/;

/** Prefixes a quote so spreadsheets show a value as text instead of running it as a formula. */
export function csvSafe<T>(value: T): T | string {
  return typeof value === 'string' && FORMULA_PREFIX.test(value) ? `'${value}` : value;
}
