/**
 * A formula trigger (= + - @ | %) after any run of whitespace, control or invisible characters.
 * Spreadsheets skip those leading characters, so they must not hide the trigger.
 */
const FORMULA_PREFIX = /^[\s\u0000-\u001f​-‍⁠﻿]*[=+\-@|%]/;

/** Prefixes a quote so spreadsheets show a value as text instead of running it as a formula. */
export function csvSafe<T>(value: T): T | string {
  return typeof value === 'string' && FORMULA_PREFIX.test(value) ? `'${value}` : value;
}
