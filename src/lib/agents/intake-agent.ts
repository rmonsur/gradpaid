import { generateText, tool, type CoreMessage } from 'ai';
import { z } from 'zod';
import { extractionModel } from './model';
import { logger } from '@/lib/logger';

/**
 * Structured extraction via a single tool the model is asked to call. Claude 5 rejects
 * forced tool choice, so the schema is offered as a tool and the call is parsed back.
 */
async function callTool<T extends z.ZodTypeAny>(
  name: string,
  description: string,
  schema: T,
  messages: readonly CoreMessage[],
): Promise<z.infer<T>> {
  const result = await generateText({
    model: extractionModel(),
    messages: [...messages],
    tools: { [name]: tool({ description, parameters: schema }) },
    maxSteps: 1,
  });
  const call = result.toolCalls.find((c) => c.toolName === name);
  if (!call) {
    logger.warn(
      { tool: name, finishReason: result.finishReason, textLength: result.text.length },
      'extraction model did not call its tool',
    );
    throw new Error(`Model did not call ${name}`);
  }
  return schema.parse(call.args);
}

export const loanFactsSchema = z.object({
  servicerName: z.string().describe('Name of the loan servicer, e.g. MOHELA, Nelnet, Aidvantage.'),
  loanAccountRef: z
    .string()
    .describe('Account or loan reference as printed. Keep digits only if possible.'),
  balanceCents: z
    .number()
    .int()
    .nonnegative()
    .describe('Current principal balance in integer cents.'),
  interestRateBps: z
    .number()
    .int()
    .nonnegative()
    .describe('Interest rate in basis points, 5.5% = 550.'),
  monthlyPaymentCents: z
    .number()
    .int()
    .nonnegative()
    .describe('Scheduled monthly payment in cents.'),
  borrowerName: z.string().describe('Borrower name as printed, or empty string if unreadable.'),
  confidence: z.number().min(0).max(1).describe('Your confidence the fields are read correctly.'),
});

export type LoanFacts = z.infer<typeof loanFactsSchema>;

export interface IntakeFile {
  readonly bytes: Uint8Array;
  readonly mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
}

/**
 * Reads a loan statement with a vision-capable model and returns structured loan facts.
 * This is the highest-stakes extraction in the product, so it uses the strongest model.
 */
export async function extractLoanFacts(file: IntakeFile): Promise<LoanFacts> {
  const part =
    file.mimeType === 'application/pdf'
      ? ({ type: 'file', data: file.bytes, mimeType: file.mimeType } as const)
      : ({ type: 'image', image: file.bytes, mimeType: file.mimeType } as const);
  return callTool(
    'report_loan_facts',
    'Report the loan facts read from the statement. Call this exactly once.',
    loanFactsSchema,
    [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Read this student loan statement and call report_loan_facts with what it shows. Amounts must be integer cents. If a field is missing, use 0 or an empty string and lower your confidence.',
          },
          part,
        ],
      },
    ],
  );
}

export const draftSchema = z.object({
  title: z.string().max(80),
  story: z.string().max(900),
  cohortTags: z.array(z.string()).max(6),
});

export type CampaignDraft = z.infer<typeof draftSchema>;

export interface DraftInput {
  readonly facts: LoanFacts;
  readonly school: string;
  readonly fieldOfStudy: string;
  readonly state: string;
  readonly aboutMe: string;
}

export async function draftCampaign(input: DraftInput): Promise<CampaignDraft> {
  return callTool(
    'submit_campaign_draft',
    'Submit the drafted campaign title, story, and cohort tags. Call this exactly once.',
    draftSchema,
    [
      {
        role: 'user',
        content: `Write a short, dignified campaign for a graduate seeking help with a student loan and submit it with submit_campaign_draft. Do not include the account number. Facts: ${JSON.stringify(
          { ...input, facts: { ...input.facts, loanAccountRef: '[hidden]' } },
        )}. cohortTags should be lowercase single words such as the field, the state, and "first-gen" if implied.`,
      },
    ],
  );
}
