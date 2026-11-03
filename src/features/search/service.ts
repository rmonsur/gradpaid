import { getElastic, CAMPAIGN_INDEX } from '@/lib/elastic/client';
import { logger } from '@/lib/logger';
import {
  searchCampaignsInPostgres,
  getCampaignsByIds,
  toSummary,
  type CampaignSummary,
} from '@/features/campaigns/service';
import type { Campaign } from '@/db/schema';

const DEFAULT_LIMIT = 5;

interface CampaignDoc {
  readonly id: string;
  readonly title: string;
  readonly story: string;
  readonly school: string;
  readonly fieldOfStudy: string;
  readonly state: string;
  readonly cohortTags: readonly string[];
  readonly remainingCents: number;
  readonly status: string;
}

export async function ensureCampaignIndex(): Promise<void> {
  const es = getElastic();
  if (!es) {
    return;
  }
  const exists = await es.indices.exists({ index: CAMPAIGN_INDEX });
  if (!exists) {
    await es.indices.create({
      index: CAMPAIGN_INDEX,
      mappings: {
        properties: {
          story: { type: 'text' },
          story_semantic: { type: 'semantic_text' },
          title: { type: 'text' },
          school: { type: 'text' },
          fieldOfStudy: { type: 'text' },
          state: { type: 'keyword' },
          cohortTags: { type: 'keyword' },
          status: { type: 'keyword' },
          remainingCents: { type: 'integer' },
        },
      },
    });
  }
}

export async function indexCampaign(c: Campaign): Promise<void> {
  const es = getElastic();
  if (!es) {
    return;
  }
  const s = toSummary(c);
  const doc: CampaignDoc & { story_semantic: string } = {
    id: s.id,
    title: s.title,
    story: s.story,
    story_semantic: `${s.title}. ${s.story}`,
    school: s.school,
    fieldOfStudy: s.fieldOfStudy,
    state: s.state,
    cohortTags: s.cohortTags,
    remainingCents: s.remainingCents,
    status: s.status,
  };
  await es.index({ index: CAMPAIGN_INDEX, id: s.id, document: doc, refresh: 'wait_for' });
}

/**
 * Hybrid search (keyword + semantic, fused with RRF) when Elastic is configured.
 * Falls back to a Postgres keyword search on any failure so the donor flow never breaks.
 */
export async function searchCampaigns(
  query: string,
  limit: number = DEFAULT_LIMIT,
): Promise<{
  readonly results: readonly CampaignSummary[];
  readonly engine: 'elastic' | 'postgres';
}> {
  const es = getElastic();
  if (es) {
    try {
      const res = await es.search<CampaignDoc>({
        index: CAMPAIGN_INDEX,
        size: limit,
        retriever: {
          rrf: {
            retrievers: [
              {
                standard: {
                  query: {
                    bool: {
                      must: [
                        {
                          multi_match: {
                            query,
                            fields: [
                              'title^2',
                              'story',
                              'school',
                              'fieldOfStudy',
                              'state',
                              'cohortTags',
                            ],
                          },
                        },
                      ],
                      filter: [{ term: { status: 'active' } }],
                    },
                  },
                },
              },
              { standard: { query: { semantic: { field: 'story_semantic', query } } } },
            ],
          },
        },
      });
      const ids = res.hits.hits.map((h) => h._id).filter((id): id is string => Boolean(id));
      const rows = await getCampaignsByIds(ids);
      const byId = new Map(rows.map((r) => [r.id, toSummary(r)]));
      const ordered = ids.map((id) => byId.get(id)).filter((c): c is CampaignSummary => Boolean(c));
      return { results: ordered.filter((c) => c.status === 'active'), engine: 'elastic' };
    } catch (err) {
      logger.warn({ err }, 'elastic search failed, falling back to postgres');
    }
  }
  return { results: await searchCampaignsInPostgres(query, limit), engine: 'postgres' };
}
