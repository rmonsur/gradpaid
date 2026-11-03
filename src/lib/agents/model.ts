import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModelV1 } from 'ai';
import { getEnv } from '@/lib/env';
import { MODELS } from '@/lib/constants';

let provider: ReturnType<typeof createAnthropic> | undefined;

function getProvider(): ReturnType<typeof createAnthropic> {
  if (!provider) {
    provider = createAnthropic({ apiKey: getEnv().ANTHROPIC_API_KEY });
  }
  return provider;
}

export function agentModel(): LanguageModelV1 {
  return getProvider()(MODELS.agent);
}

export function extractionModel(): LanguageModelV1 {
  return getProvider()(MODELS.extraction);
}
