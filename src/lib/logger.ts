import pino, { type Logger } from 'pino';

const REDACTED_PATHS = [
  'req.headers.authorization',
  '*.client_secret',
  '*.clientSecret',
  '*.access_token',
  '*.accessToken',
  '*.loanAccountRef',
  '*.email',
];

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
  base: { service: 'gradpaid' },
});

export function childLogger(bindings: Record<string, string | number>): Logger {
  return logger.child(bindings);
}
