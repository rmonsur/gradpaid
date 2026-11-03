import { z } from 'zod';
import { ok, fail, handle } from '@/lib/http';
import { extractLoanFacts, draftCampaign, type IntakeFile } from '@/lib/agents/intake-agent';
import { ALLOWED_STATEMENT_TYPES, MAX_STATEMENT_BYTES } from '@/lib/constants';
import { signLoanFacts } from '@/lib/intake-token';

export const maxDuration = 60;

const fieldsSchema = z.object({
  school: z.string().min(2).max(120),
  fieldOfStudy: z.string().min(2).max(80),
  state: z.string().length(2),
  aboutMe: z.string().max(600).default(''),
});

type AllowedType = (typeof ALLOWED_STATEMENT_TYPES)[number];

function isAllowedType(t: string): t is AllowedType {
  return (ALLOWED_STATEMENT_TYPES as readonly string[]).includes(t);
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const form = await req.formData();
    const file = form.get('statement');
    if (!(file instanceof File)) {
      return fail('A statement file is required', 400);
    }
    if (!isAllowedType(file.type)) {
      return fail('Statement must be a PDF, JPEG, or PNG', 415);
    }
    if (file.size > MAX_STATEMENT_BYTES) {
      return fail('Statement exceeds the 10MB limit', 413);
    }
    const fields = fieldsSchema.parse(Object.fromEntries(form.entries()));
    const intake: IntakeFile = {
      bytes: new Uint8Array(await file.arrayBuffer()),
      mimeType: file.type,
    };
    const facts = await extractLoanFacts(intake);
    const draft = await draftCampaign({ facts, ...fields });
    const intakeToken = signLoanFacts(facts);
    return ok({
      facts: { ...facts, loanAccountRef: `****${facts.loanAccountRef.slice(-4)}` },
      draft,
      loanAccountRef: facts.loanAccountRef,
      intakeToken,
    });
  });
}
