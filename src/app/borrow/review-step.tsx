'use client';

import { useState } from 'react';
import { Badge, Button, Card } from '@/components/ui';
import { formatUsd } from '@/lib/money';
import { Field, TextInput, TextArea } from './form-fields';
import {
  LOW_CONFIDENCE_THRESHOLD,
  defaultGoalDollars,
  parseTags,
  type IntakeResult,
  type ReviewFields,
} from './types';

export interface ReviewStepProps {
  readonly intake: IntakeResult;
  readonly onBack: () => void;
  readonly onContinue: (review: ReviewFields) => void;
}

const BPS_PER_PERCENT = 100;

function formatRate(bps: number): string {
  return `${(bps / BPS_PER_PERCENT).toFixed(2)}%`;
}

export function ReviewStep({ intake, onBack, onContinue }: ReviewStepProps): React.ReactElement {
  const { facts, draft } = intake;
  const [review, setReview] = useState<ReviewFields>({
    title: draft.title,
    story: draft.story,
    cohortTagsText: draft.cohortTags.join(', '),
    goalDollars: defaultGoalDollars(facts.balanceCents),
  });
  const [error, setError] = useState<string | null>(null);
  const lowConfidence = facts.confidence < LOW_CONFIDENCE_THRESHOLD;
  const confidencePct = Math.round(facts.confidence * 100);

  const update = (key: keyof ReviewFields, value: string): void => {
    setReview((r) => ({ ...r, [key]: value }));
  };

  const next = (): void => {
    const goal = Number.parseFloat(review.goalDollars);
    if (review.title.trim().length < 4) {
      setError('Give your campaign a title of at least four characters.');
      return;
    }
    if (review.story.trim().length < 20) {
      setError('Your story needs at least twenty characters.');
      return;
    }
    if (Number.isNaN(goal) || goal <= 0) {
      setError('Enter a goal greater than zero.');
      return;
    }
    if (parseTags(review.cohortTagsText).length === 0) {
      setError('Add at least one tag so donors can find you.');
      return;
    }
    setError(null);
    onContinue(review);
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Agent read this from your statement</h2>
          <Badge tone={lowConfidence ? 'warning' : 'success'}>{confidencePct}% confidence</Badge>
        </div>
        {lowConfidence ? (
          <p className="mb-3 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
            The agent was not sure about some fields. Check them against your statement before
            publishing.
          </p>
        ) : null}
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Row label="Servicer" value={facts.servicerName || 'Not found'} />
          <Row label="Account" value={facts.loanAccountRef} mono />
          <Row label="Balance" value={formatUsd(facts.balanceCents)} />
          <Row label="Interest rate" value={formatRate(facts.interestRateBps)} />
          <Row label="Monthly payment" value={formatUsd(facts.monthlyPaymentCents)} />
          <Row label="Name on statement" value={facts.borrowerName || 'Not found'} />
        </dl>
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold">Your campaign</h2>
        <div className="space-y-4">
          <Field label="Title">
            <TextInput
              value={review.title}
              onChange={(e) => update('title', e.target.value)}
              maxLength={80}
            />
          </Field>
          <Field
            label="Story"
            hint="Drafted by the agent. Edit freely. The account number is never included."
          >
            <TextArea
              value={review.story}
              onChange={(e) => update('story', e.target.value)}
              maxLength={900}
              className="min-h-40"
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tags" hint="Comma separated, up to six. Donors search by these.">
              <TextInput
                value={review.cohortTagsText}
                onChange={(e) => update('cohortTagsText', e.target.value)}
              />
            </Field>
            <Field label="Goal (USD)" hint="Defaults to your balance, capped at $5,000.">
              <TextInput
                type="number"
                min="1"
                step="0.01"
                value={review.goalDollars}
                onChange={(e) => update('goalDollars', e.target.value)}
              />
            </Field>
          </div>
          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-between">
            <Button type="button" variant="secondary" onClick={onBack}>
              Back
            </Button>
            <Button type="button" onClick={next}>
              Continue to publish
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): React.ReactElement {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
      <dt className="text-muted">{label}</dt>
      <dd className={mono ? 'font-mono' : 'font-medium'}>{value}</dd>
    </div>
  );
}
