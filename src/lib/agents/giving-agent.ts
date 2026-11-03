import { streamText, tool, type CoreMessage, type Tool } from 'ai';
import { z } from 'zod';
import { agentModel } from './model';
import { withActivity, createActivityRecorder } from './activity';
import { createPayPalToolkit, GIVING_ACTIONS } from '@/lib/paypal/toolkit';
import { searchCampaigns } from '@/features/search/service';
import { splitDonation } from '@/features/campaigns/split';
import { getCampaignsByIds, toSummary } from '@/features/campaigns/service';
import { recordOrder } from '@/features/giving/service';
import { fromCents } from '@/lib/money';
import { MAX_AGENT_STEPS, MAX_SPLIT_CAMPAIGNS } from '@/lib/constants';

const SYSTEM_PROMPT = `You are the GradPaid giving agent. You help a donor direct one PayPal payment to the student loan balances of verified graduates. Money goes to the loan servicer, never to the borrower.

Follow this sequence and keep replies short and warm:
1. Understand who the donor wants to help and how much they want to give. Ask one question at a time if either is missing.
2. Call search_campaigns with their intent. Present at most ${MAX_SPLIT_CAMPAIGNS} campaigns with one line each on why they fit.
3. Call propose_split with the amount and chosen campaign ids. Show the split in dollars and ask the donor to confirm.
4. Only after the donor confirms, call create_order with one item per campaign, then record_donation_order with the PayPal order id and the exact same split.
5. Tell the donor the PayPal button is ready. Do not invent order ids, amounts, or campaigns.

All amounts you pass to tools are integer cents except create_order, which takes dollars with two decimals.`;

export interface GivingAgentInput {
  readonly messages: readonly CoreMessage[];
  readonly donorName: string;
}

function buildLocalTools(donorName: string): Readonly<Record<string, Tool>> {
  return {
    search_campaigns: tool({
      description: 'Search verified, active loan campaigns by the donor intent in plain language.',
      parameters: z.object({ query: z.string().min(2) }),
      execute: async ({ query }): Promise<unknown> => {
        const { results, engine } = await searchCampaigns(query);
        return {
          engine,
          campaigns: results.map((c) => ({
            id: c.id,
            title: c.title,
            school: c.school,
            fieldOfStudy: c.fieldOfStudy,
            state: c.state,
            cohortTags: c.cohortTags,
            remainingCents: c.remainingCents,
            summary: c.story.slice(0, 220),
          })),
        };
      },
    }),
    propose_split: tool({
      description:
        'Split a donation in cents across chosen campaign ids, respecting what each still needs.',
      parameters: z.object({
        totalCents: z.number().int().positive(),
        campaignIds: z.array(z.string()).min(1).max(MAX_SPLIT_CAMPAIGNS),
        reasons: z.array(z.string()).describe('One short reason per campaign id, same order.'),
      }),
      execute: async ({ totalCents, campaignIds, reasons }): Promise<unknown> => {
        const rows = await getCampaignsByIds(campaignIds);
        const candidates = campaignIds.map((id, i) => {
          const c = rows.find((r) => r.id === id);
          const summary = c ? toSummary(c) : undefined;
          return {
            campaignId: id,
            remainingCents: summary?.remainingCents ?? 0,
            reason: reasons[i] ?? '',
          };
        });
        const split = splitDonation(totalCents, candidates);
        return {
          split: split.map((l) => ({ ...l, dollars: fromCents(l.cents).toFixed(2) })),
          totalDollars: fromCents(totalCents).toFixed(2),
        };
      },
    }),
    record_donation_order: tool({
      description:
        'Record a created PayPal order and its split so the checkout button can be shown.',
      parameters: z.object({
        paypalOrderId: z.string().min(5),
        totalCents: z.number().int().positive(),
        split: z.array(
          z.object({
            campaignId: z.string(),
            cents: z.number().int().positive(),
            reason: z.string(),
          }),
        ),
      }),
      execute: async (input): Promise<unknown> => {
        const order = await recordOrder({ ...input, donorName });
        return { ok: true, paypalOrderId: order.paypalOrderId, totalCents: order.totalCents };
      },
    }),
  };
}

export function runGivingAgent(input: GivingAgentInput): ReturnType<typeof streamText> {
  const recorder = createActivityRecorder();
  const paypal = createPayPalToolkit(GIVING_ACTIONS);
  const tools = withActivity({ ...buildLocalTools(input.donorName), ...paypal.tools }, recorder);
  return streamText({
    model: agentModel(),
    system: SYSTEM_PROMPT,
    messages: [...input.messages],
    tools,
    maxSteps: MAX_AGENT_STEPS,
  });
}
