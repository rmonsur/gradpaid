import { z } from 'zod';
import { convertToCoreMessages, type Message } from 'ai';
import { runGivingAgent } from '@/lib/agents/giving-agent';
import { fail } from '@/lib/http';
import { logger } from '@/lib/logger';

export const maxDuration = 60;

const MAX_MESSAGES = 40;

/**
 * UI messages from useChat carry parts and tool invocations. They are passed through
 * convertToCoreMessages so the model keeps its own earlier tool results across turns.
 */
const bodySchema = z.object({
  messages: z
    .array(
      z
        .object({
          id: z.string().optional(),
          role: z.enum(['user', 'assistant', 'system']),
          content: z.string(),
        })
        .passthrough(),
    )
    .min(1)
    .max(MAX_MESSAGES),
  donorName: z.string().min(1).max(80).default('Anonymous donor'),
});

export async function POST(req: Request): Promise<Response> {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail('Invalid chat request', 400);
  }
  try {
    const uiMessages: Message[] = parsed.data.messages.map((m, i) => ({
      ...m,
      id: m.id ?? `m${i}`,
    }));
    const coreMessages = convertToCoreMessages(uiMessages);
    const result = runGivingAgent({ messages: coreMessages, donorName: parsed.data.donorName });
    return result.toDataStreamResponse();
  } catch (err) {
    logger.error({ err }, 'giving agent failed to start');
    return fail('Giving agent unavailable', 500);
  }
}
