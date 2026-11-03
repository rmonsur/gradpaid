import Link from 'next/link';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';
import { listActiveCampaigns, type CampaignSummary } from '@/features/campaigns/service';
import { formatUsd } from '@/lib/money';
import { Badge, Card, ProgressBar } from '@/components/ui';

export const dynamic = 'force-dynamic';

const STEPS = [
  {
    title: 'A graduate verifies a statement',
    body: 'The intake agent reads a real loan statement and drafts a campaign. The borrower approves it. No account numbers are ever shown.',
  },
  {
    title: 'A donor gives once with PayPal',
    body: 'Tell the giving agent who you want to help. It finds verified campaigns, proposes a split, and creates one PayPal order.',
  },
  {
    title: 'The agent pays the servicer',
    body: 'The disbursement agent sends payouts to the loan servicer, invoices matching sponsors, and reconciles every cent against PayPal.',
  },
] as const;

const PAYPAL_PRODUCTS = [
  'PayPal Agent Toolkit',
  'Orders',
  'Invoicing',
  'Payouts',
  'Reporting',
] as const;
const SPONSORS = ['Elastic', 'AG Grid', 'Render', 'Postman'] as const;

async function loadCampaigns(): Promise<readonly CampaignSummary[] | null> {
  try {
    return await listActiveCampaigns();
  } catch {
    return null;
  }
}

function CampaignCard({ c }: { c: CampaignSummary }): React.ReactElement {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {c.cohortTags.map((t) => (
          <Badge key={t} tone="accent">
            {t}
          </Badge>
        ))}
      </div>
      <h3 className="text-lg font-semibold leading-snug">{c.title}</h3>
      <p className="text-sm text-muted">
        {c.school} · {c.fieldOfStudy} · {c.state}
      </p>
      <p className="line-clamp-3 text-sm">{c.story}</p>
      <div className="mt-auto space-y-2">
        <ProgressBar value={c.raisedCents} max={c.goalCents} />
        <div className="flex justify-between text-xs text-muted">
          <span>{formatUsd(c.raisedCents)} raised</span>
          <span>{formatUsd(c.goalCents)} goal</span>
        </div>
        <p className="text-xs text-muted">Paid to {c.servicerName}, never to the borrower.</p>
      </div>
      <Link href="/give" className="text-sm font-medium text-accent-strong hover:underline">
        Give toward this loan
      </Link>
    </Card>
  );
}

export default async function Home(): Promise<React.ReactElement> {
  const campaigns = await loadCampaigns();
  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <Badge tone="accent">Built on the PayPal Agent Toolkit</Badge>
          <h1 className="text-5xl font-semibold leading-tight tracking-tight">{APP_TAGLINE}</h1>
          <p className="max-w-xl text-lg text-muted">
            Forty-three million Americans carry student debt, and the people around them want to
            help. Cash gifts get diverted, crowdfunding pays the borrower instead of the lender, and
            nobody reconciles anything. {APP_NAME} is crowd-repayment where an AI agent routes every
            dollar straight to the loan servicer.
          </p>
          <div className="flex gap-3">
            <Link
              href="/give"
              className="rounded-lg bg-accent-strong px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent"
            >
              Give toward a loan
            </Link>
            <Link
              href="/borrow"
              className="rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium transition hover:bg-accent-soft"
            >
              I am a borrower
            </Link>
          </div>
        </div>
        <Card className="space-y-4 bg-accent-strong text-white">
          <div className="text-xs font-medium uppercase tracking-wide text-white/70">The rule</div>
          <p className="text-2xl font-semibold leading-snug">
            The money never touches the borrower.
          </p>
          <p className="text-sm text-white/80">
            Donations are captured by PayPal, held by the platform, and paid out by an agent
            directly to the servicer with the loan reference attached. Every step is on the public
            ledger.
          </p>
        </Card>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Card key={s.title} className="space-y-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft font-mono text-sm font-semibold text-accent-strong">
                {i + 1}
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-muted">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            Built on PayPal
          </div>
          <div className="flex flex-wrap gap-2">
            {PAYPAL_PRODUCTS.map((p) => (
              <Badge key={p} tone="accent">
                {p}
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">
            Every PayPal action is a function-calling tool from the Agent Toolkit, executed by an
            agent and shown on screen as it happens.
          </p>
        </Card>
        <Card>
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            Powered by
          </div>
          <div className="flex flex-wrap gap-2">
            {SPONSORS.map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">
            Elastic matches donor intent to campaigns, AG Grid renders the public ledger, Render
            hosts the app and the agent schedule, Postman monitors health.
          </p>
        </Card>
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Verified campaigns</h2>
          <Link href="/give" className="text-sm font-medium text-accent-strong hover:underline">
            Ask the giving agent
          </Link>
        </div>
        {campaigns === null ? (
          <Card className="text-center text-sm text-muted">
            Campaigns are temporarily unavailable. Check the agent console for service health.
          </Card>
        ) : campaigns.length === 0 ? (
          <Card className="text-center text-sm text-muted">
            No active campaigns yet. Use the agent console to seed the demo.
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {campaigns.map((c) => (
              <CampaignCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
