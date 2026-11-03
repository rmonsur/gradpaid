const WHEN_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

/** Short local timestamp used by the console and the ledger. */
export function formatWhen(value: Date | string): string {
  return new Date(value).toLocaleString('en-US', WHEN_FORMAT);
}
