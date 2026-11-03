import { IntakeClient } from './intake-client';
import { PageHeader, Card } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default function BorrowPage(): React.ReactElement {
  return (
    <div>
      <PageHeader
        eyebrow="Intake agent"
        title="Start a campaign."
        subtitle="Upload a loan statement. The intake agent reads it, drafts your campaign, and you approve before anything is published."
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <IntakeClient />
        <aside className="space-y-4">
          <Card>
            <h2 className="label text-foreground">What happens to your statement</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>
                The file type and size are checked before upload. PDF, JPEG, or PNG up to 10MB.
              </li>
              <li>
                The intake agent reads it once to extract the servicer, balance, rate, and payment.
              </li>
              <li>
                Your account number is shown masked in the interface and is never written to logs.
              </li>
              <li>Nothing is published until you review and approve the draft.</li>
            </ul>
          </Card>
          <Card className="border-accent/40 bg-accent-soft">
            <p className="text-sm text-foreground">
              Donations are paid to your servicer. You never receive funds.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
