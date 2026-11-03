import { z } from 'zod';

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PAYPAL_CLIENT_ID: z.string().min(1),
  PAYPAL_CLIENT_SECRET: z.string().min(1),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_SERVICER_EMAIL: z.string().email(),
  PAYPAL_SPONSOR_EMAIL: z.string().email(),
  ANTHROPIC_API_KEY: z.string().min(1),
  ELASTIC_URL: z.string().url().optional(),
  ELASTIC_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().min(8),
  DEMO_TOKEN: z.string().min(8),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/** Treats empty strings as unset so optional variables can be left blank in .env files. */
function withoutEmptyStrings(env: NodeJS.ProcessEnv): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(env).map(([k, v]) => [k, v === '' ? undefined : v]));
}

/**
 * Validates and returns server environment variables. Fails fast with a readable
 * message listing every missing or malformed variable.
 */
export function getEnv(): ServerEnv {
  if (cached) {
    return cached;
  }
  const parsed = serverEnvSchema.safeParse(withoutEmptyStrings(process.env));
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
  }
  cached = parsed.data;
  return cached;
}

export function isElasticConfigured(env: ServerEnv): boolean {
  return Boolean(env.ELASTIC_URL && env.ELASTIC_API_KEY);
}
