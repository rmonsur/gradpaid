import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { getEnv } from '@/lib/env';

export type Db = PostgresJsDatabase<typeof schema>;

let instance: Db | undefined;

export function getDb(): Db {
  if (!instance) {
    const sql = postgres(getEnv().DATABASE_URL, { max: 5, prepare: false });
    instance = drizzle(sql, { schema });
  }
  return instance;
}
