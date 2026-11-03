'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Card, Badge } from '@/components/ui';
import { formatUsd, toCents } from '@/lib/money';
import { ErrorBanner } from './form-fields';
import {
  parseTags,
  type ApiEnvelope,
  type IntakeResult,
  type ReviewFields,
  type UploadFields,
} from './types';

export interface PublishStepProps {
  readonly upload: UploadFields;
  readonly intake: IntakeResult;
  readonly review: ReviewFields;
  readonly onBack: () => void;
}

interface CreatedCampaign {
  readonly id: string;
}

export function PublishStep({
  upload,
  intake,
  review,
  onBack,
}: PublishStepProps): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedCampaign | null>(null);
  const tags = parseTags(review.cohortTagsText);
  const goalCents = toCents(Number.parseFloat(review.goalDollars));

  const publish = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: upload.displayName,
          email: upload.email,
          title: review.title.trim(),
          story: review.story.trim(),
          school: upload.school,
          fieldOfStudy: upload.fieldOfStudy,
          state: upload.state,
          cohortTags: tags,
          servicerName: intake.facts.servicerName,
          loanAccountRef: intake.loanAccountRef,
          balanceCents: intake.facts.balanceCents,
          interestRateBps: intake.facts.interestRateBps,
          monthlyPaymentCents: intake.facts.monthlyPaymentCents,
          goalCents,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<CreatedCampaign>;
      if (!res.ok || !body.success || !body.data) {
        setError(body.error ?? 'Publishing failed. Please try again.');
        return;
      }
      setCreated(body.data);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <Card className="border-success/30">
        <Badge tone="success">Published</Badge>
        <h2 className="mt-3 text-xl font-semibold tracking-tight">{review.title}</h2>
        <p className="mt-1 text-sm text-muted">
          Campaign id <code className="font-mono">{created.id}</code>
        </p>
        <p className="mt-4 rounded-lg bg-accent-soft/60 px-4 py-3 text-sm font-medium text-accent-strong">
          Donations are paid to your servicer. You never receive funds.
        </p>
        <div className="mt-5 flex gap-3">
          <Link
            href="/give"
            className="inline-flex items-center rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-white hover:bg-accent"
          >
            See the giving page
          </Link>
          <Link
            href="/ledger"
            className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent-soft"
          >
            Open the ledger
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold">Ready to publish</h2>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Summary label="Title" value={review.title} />
        <Summary label="Goal" value={formatUsd(goalCents)} />
        <Summary label="Servicer" value={intake.facts.servicerName} />
        <Summary label="Account" value={intake.facts.loanAccountRef} />
        <Summary label="School" value={upload.school} />
        <Summary label="Location" value={`${upload.fieldOfStudy}, ${upload.state}`} />
      </dl>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <Badge key={t} tone="accent">
            {t}
          </Badge>
        ))}
      </div>
      <p className="mt-4 whitespace-pre-line text-sm text-muted">{review.story}</p>
      <p className="mt-4 rounded-lg bg-accent-soft/60 px-4 py-3 text-sm font-medium text-accent-strong">
        Donations are paid to your servicer. You never receive funds.
      </p>
      {error ? (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      ) : null}
      <div className="mt-5 flex justify-between">
        <Button type="button" variant="secondary" onClick={onBack} disabled={busy}>
          Back
        </Button>
        <Button type="button" onClick={publish} disabled={busy}>
          {busy ? 'Publishing' : 'Publish campaign'}
        </Button>
      </div>
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
