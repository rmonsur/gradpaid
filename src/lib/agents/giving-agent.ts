import { streamText, tool, type CoreMessage, type Tool } from 'ai';
import { z } from 'zod';
import { agentModel } from './model';
import { withActivity, createActivityRecorder } from './activity';
import { createPayPalToolkit, GIVING_ACTIONS } from '@/lib/paypal/toolkit';
import { searchCampaigns } from '@/features/search/service';
import { splitDonation } from '@/features/campaigns/split';
import { getCampaignsByIds, toSummary } from '@/features/campaigns/service';
import { recordOrder } from '@/features/giving/service';
import { fromCents, parsePayPalAmount, DEFAULT_CURRENCY } from '@/lib/money';
import { parseToolResult } from '@/lib/paypal/results';
import { MAX_AGENT_STEPS, MAX_SPLIT_CAMPAIGNS } from '@/lib/constants';

const SYSTEM_PROMPT = `You are the GradPaid giving agent. You help a donor direct one PayPal payment to the student loan balances of verified graduates. Money goes to the loan servicer, never to the borrower.

Follow this sequence and keep replies short and warm:
1. Understand who the donor wants to help and how much they want to give. Ask one question at a time if either is missing.
2. Call search_campaigns with their intent. Present at most ${MAX_SPLIT_CAMPAIGNS} campaigns with one line each on why they fit.
3. Call propose_split with the amount and chosen campaign ids. Show the split in dollars and ask the donor to confirm.
4. Only after the donor confirms, call create_order with one item per campaign, then record_donation_order with the PayPal order id and the exact same split.
5. Tell the donor the PayPal button is ready. Do not invent order ids, amounts, or campaigns.

Write in plain sentences without markdown, asterisks, or headings. Dollar amounts like $50.00 are fine.

All amounts you pass to tools are integer cents except create_order, which takes dollars with two decimals.`;

export interface GivingAgentInput {
  readonly messages: readonly CoreMessage[];
  readonly donorName: string;
}

interface OrderLookup {
  readonly id?: string;
  readonly status?: string;
  readonly purchase_units?: readonly {
    readonly amount?: { readonly value: string; readonly currency_code: string };
  }[];
}

/** Reads the order back from PayPal so a recorded split can never disagree with the real order. */
async function verifyPayPalOrder(
  paypalTools: Readonly<Record<string, Tool>>,
  paypalOrderId: string,
  totalCents: number,
): Promise<string | null> {
  const getOrder = paypalTools.get_order;
  if (!getOrder?.execute) {
    return 'get_order unavailable';
  }
  const raw = parseToolResult(
    await getOrder.execute({ id: paypalOrderId }, { toolCallId: paypalOrderId, messages: [] }),
  ) as OrderLookup;
  const amount = raw.purchase_units?.[0]?.amount;
  if (!amount || amount.currency_code !== DEFAULT_CURRENCY) {
    return 'order not found or wrong currency';
  }
  if (parsePayPalAmount(amount.value) !== totalCents) {
    return `order total ${amount.value} does not match ${fromCents(totalCents).toFixed(2)}`;
  }
  return null;
}

function buildLocalTools(
  donorName: string,
  paypalTools: Readonly<Record<string, Tool>>,
): Readonly<Record<string, Tool>> {
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
        const problem = await verifyPayPalOrder(paypalTools, input.paypalOrderId, input.totalCents);
        if (problem) {
          return { error: `PayPal order check failed: ${problem}` };
        }
        const rows = await getCampaignsByIds(input.split.map((l) => l.campaignId));
        const inactive = input.split.filter(
          (l) => !rows.some((r) => r.id === l.campaignId && r.status === 'active'),
        );
        if (inactive.length > 0) {
          return { error: 'split references a campaign that is not active' };
        }
        const order = await recordOrder({ ...input, donorName });
        return { ok: true, paypalOrderId: order.paypalOrderId, totalCents: order.totalCents };
      },
    }),
  };
}

export function runGivingAgent(input: GivingAgentInput): ReturnType<typeof streamText> {
  const recorder = createActivityRecorder();
  const paypal = createPayPalToolkit(GIVING_ACTIONS);
  const tools = withActivity(
    { ...buildLocalTools(input.donorName, paypal.tools), ...paypal.tools },
    recorder,
  );
  return streamText({
    model: agentModel(),
    system: SYSTEM_PROMPT,
    messages: [...input.messages],
    tools,
    maxSteps: MAX_AGENT_STEPS,
  });
}
