import { z } from 'zod';
import { ALLOWED_STATEMENT_TYPES, MAX_STATEMENT_BYTES } from '@/lib/constants';

export const MAX_GOAL_DEFAULT_CENTS = 500_000;
export const LOW_CONFIDENCE_THRESHOLD = 0.7;

export const uploadSchema = z.object({
  displayName: z.string().trim().min(1, 'Name is required').max(80),
  email: z.string().trim().email('Enter a valid email'),
  school: z.string().trim().min(2, 'School is required').max(120),
  fieldOfStudy: z.string().trim().min(2, 'Field of study is required').max(80),
  state: z.string().length(2, 'Pick a state'),
  aboutMe: z.string().trim().max(600, 'Keep this under 600 characters'),
});

export type UploadFields = z.infer<typeof uploadSchema>;

export interface LoanFactsView {
  readonly servicerName: string;
  readonly loanAccountRef: string;
  readonly balanceCents: number;
  readonly interestRateBps: number;
  readonly monthlyPaymentCents: number;
  readonly borrowerName: string;
  readonly confidence: number;
}

export interface DraftView {
  readonly title: string;
  readonly story: string;
  readonly cohortTags: readonly string[];
}

export interface IntakeResult {
  readonly facts: LoanFactsView;
  readonly draft: DraftView;
  readonly loanAccountRef: string;
}

export interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: string | null;
}

export interface ReviewFields {
  readonly title: string;
  readonly story: string;
  readonly cohortTagsText: string;
  readonly goalDollars: string;
}

export function validateStatementFile(file: File | null): string | null {
  if (!file) {
    return 'Choose a statement file';
  }
  if (!(ALLOWED_STATEMENT_TYPES as readonly string[]).includes(file.type)) {
    return 'Statement must be a PDF, JPEG, or PNG';
  }
  if (file.size > MAX_STATEMENT_BYTES) {
    return 'Statement exceeds the 10MB limit';
  }
  return null;
}

export function defaultGoalDollars(balanceCents: number): string {
  const cents = Math.min(balanceCents, MAX_GOAL_DEFAULT_CENTS);
  return (cents / 100).toFixed(2);
}

export function parseTags(text: string): readonly string[] {
  return [
    ...new Set(
      text
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0),
    ),
  ].slice(0, 6);
}
