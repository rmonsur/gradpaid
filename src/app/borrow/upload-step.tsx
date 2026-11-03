'use client';

import { useState, type FormEvent } from 'react';
import { Button, Card } from '@/components/ui';
import { Field, TextInput, TextArea, Select, ErrorBanner } from './form-fields';
import { US_STATES } from './us-states';
import {
  uploadSchema,
  validateStatementFile,
  type UploadFields,
  type IntakeResult,
  type ApiEnvelope,
} from './types';

export interface UploadStepProps {
  readonly onComplete: (fields: UploadFields, result: IntakeResult) => void;
}

type FieldErrors = Partial<Record<keyof UploadFields | 'statement', string>>;

const EMPTY: UploadFields = {
  displayName: '',
  email: '',
  school: '',
  fieldOfStudy: '',
  state: '',
  aboutMe: '',
};

export function UploadStep({ onComplete }: UploadStepProps): React.ReactElement {
  const [fields, setFields] = useState<UploadFields>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (key: keyof UploadFields, value: string): void => {
    setFields((f) => ({ ...f, [key]: value }));
  };

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitError(null);
    const parsed = uploadSchema.safeParse(fields);
    const fileError = validateStatementFile(file);
    const nextErrors: FieldErrors = parsed.success
      ? {}
      : Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    if (fileError) {
      nextErrors.statement = fileError;
    }
    setErrors(nextErrors);
    if (!parsed.success || fileError || !file) {
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.set('statement', file);
      form.set('school', parsed.data.school);
      form.set('fieldOfStudy', parsed.data.fieldOfStudy);
      form.set('state', parsed.data.state);
      form.set('aboutMe', parsed.data.aboutMe);
      const res = await fetch('/api/intake', { method: 'POST', body: form });
      const body = (await res.json()) as ApiEnvelope<IntakeResult>;
      if (!res.ok || !body.success || !body.data) {
        setSubmitError(
          body.error ?? 'The intake agent could not read this statement. Try a clearer scan.',
        );
        return;
      }
      onComplete(parsed.data, body.data);
    } catch {
      setSubmitError('Could not reach the intake agent. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Your name" error={errors.displayName}>
            <TextInput
              value={fields.displayName}
              onChange={(e) => update('displayName', e.target.value)}
              disabled={busy}
              autoComplete="name"
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <TextInput
              type="email"
              value={fields.email}
              onChange={(e) => update('email', e.target.value)}
              disabled={busy}
              autoComplete="email"
            />
          </Field>
          <Field label="School" error={errors.school}>
            <TextInput
              value={fields.school}
              onChange={(e) => update('school', e.target.value)}
              disabled={busy}
            />
          </Field>
          <Field label="Field of study" error={errors.fieldOfStudy}>
            <TextInput
              value={fields.fieldOfStudy}
              onChange={(e) => update('fieldOfStudy', e.target.value)}
              disabled={busy}
            />
          </Field>
          <Field label="State" error={errors.state}>
            <Select
              value={fields.state}
              onChange={(e) => update('state', e.target.value)}
              disabled={busy}
            >
              <option value="">Select a state</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Loan statement"
            hint="PDF, JPEG, or PNG up to 10MB"
            error={errors.statement}
          >
            <TextInput
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={busy}
            />
          </Field>
        </div>
        <Field
          label="About you (optional)"
          hint="A sentence or two on your work and why this matters."
          error={errors.aboutMe}
        >
          <TextArea
            value={fields.aboutMe}
            onChange={(e) => update('aboutMe', e.target.value)}
            disabled={busy}
            maxLength={600}
          />
        </Field>
        {submitError ? <ErrorBanner message={submitError} /> : null}
        {busy ? (
          <div
            className="flex items-center gap-3 rounded-lg bg-accent-soft/60 px-4 py-3 text-sm text-accent-strong"
            role="status"
          >
            <span className="h-2 w-2 animate-pulse-dot rounded-full bg-accent" aria-hidden />
            The intake agent is reading your statement. This usually takes 10 to 20 seconds.
          </div>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={busy}>
            {busy ? 'Reading statement' : 'Read my statement'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
