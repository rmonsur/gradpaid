import { createAnthropic } from '@ai-sdk/anthropic';
import {
  wrapLanguageModel,
  type LanguageModelV1,
  type LanguageModelV1Middleware,
  type LanguageModelV1Prompt,
} from 'ai';
import { getEnv } from '@/lib/env';
import { MODELS } from '@/lib/constants';

let provider: ReturnType<typeof createAnthropic> | undefined;

function getProvider(): ReturnType<typeof createAnthropic> {
  if (!provider) {
    provider = createAnthropic({ apiKey: getEnv().ANTHROPIC_API_KEY });
  }
  return provider;
}

const REASONING_PART_TYPES = new Set(['reasoning', 'redacted-reasoning']);

/**
 * Drops the model's own reasoning blocks from replayed assistant turns. Claude 5
 * binds those blocks to the exact request that produced them and rejects replays
 * that differ, which breaks multi-step tool loops.
 */
function withoutReasoning(prompt: LanguageModelV1Prompt): LanguageModelV1Prompt {
  return prompt.map((message) => {
    if (message.role !== 'assistant') {
      return message;
    }
    const content = message.content.filter((part) => !REASONING_PART_TYPES.has(part.type));
    return { ...message, content: content.length > 0 ? content : message.content };
  });
}

/**
 * AI SDK 4 injects temperature 0 by default, and Claude 5 models reject the
 * parameter outright. This middleware strips sampling parameters so requests
 * use the model's defaults, and removes replayed reasoning blocks.
 */
const stripSamplingParams: LanguageModelV1Middleware = {
  transformParams: async ({ params }) => ({
    ...params,
    prompt: withoutReasoning(params.prompt),
    temperature: undefined,
    topP: undefined,
    topK: undefined,
  }),
};

function wrapped(modelId: string): LanguageModelV1 {
  return wrapLanguageModel({ model: getProvider()(modelId), middleware: stripSamplingParams });
}

export function agentModel(): LanguageModelV1 {
  return wrapped(MODELS.agent);
}

export function extractionModel(): LanguageModelV1 {
  return wrapped(MODELS.extraction);
}
