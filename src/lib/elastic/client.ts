import { Client } from '@elastic/elasticsearch';
import { getEnv, isElasticConfigured } from '@/lib/env';

export const CAMPAIGN_INDEX = 'gradpaid-campaigns';

let instance: Client | undefined;

/** Returns an Elastic client, or undefined when Elastic is not configured. */
export function getElastic(): Client | undefined {
  const env = getEnv();
  if (!isElasticConfigured(env)) {
    return undefined;
  }
  if (!instance) {
    instance = new Client({ node: env.ELASTIC_URL, auth: { apiKey: env.ELASTIC_API_KEY ?? '' } });
  }
  return instance;
}
