import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';
import { listActiveCampaigns, type CampaignSummary } from '@/features/campaigns/service';
import { formatUsd } from '@/lib/money';
import { Badge, Card, LinkButton, ProgressBar, Stat } from '@/components/ui';
import { SystemStatus } from '@/components/system-status';

export const dynamic = 'force-dynamic';

const STEPS = [
  {
    index: '01/',
    title: 'Intake',
    body: 'The intake agent reads a real loan statement, extracts the balance and servicer, and drafts a campaign the borrower approves. Account numbers never leave the server.',
  },
  {
    index: '02/',
    title: 'Routing',
    body: 'A donor tells the giving agent who to help. It searches verified campaigns, proposes a split, and creates one PayPal order through the Agent Toolkit.',
  },
  {
    index: '03/',
    title: 'Disbursement',
    body: 'The disbursement agent pays each loan servicer by PayPal Payout, invoices matching sponsors, and reconciles every cent against PayPal transaction search.',
  },
] as const;

const PAYPAL_PRODUCTS = [
  'Agent Toolkit',
  'Orders',
  'Payouts',
  'Invoicing',
  'Transaction Search',
] as const;
const SPONSORS = ['Elastic', 'AG Grid', 'Render', 'Postman'] as const;

async function loadCampaigns(): Promise<readonly CampaignSummary[] | null> {
  try {
    return await listActiveCampaigns();
  } catch {
    return null;
  }
}

function sumBy(
  campaigns: readonly CampaignSummary[],
  pick: (c: CampaignSummary) => number,
): number {
  return campaigns.reduce((total, c) => total + pick(c), 0);
}

function CampaignCard({ campaign }: { campaign: CampaignSummary }): React.ReactElement {
  return (
    <Card as="article" className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {campaign.cohortTags.map((t) => (
          <Badge key={t} tone="accent">
            {t}
          </Badge>
        ))}
      </div>
      <h3 className="display text-xl normal-case">{campaign.title}</h3>
      <p className="text-xs text-muted">
        {campaign.school} / {campaign.fieldOfStudy} / {campaign.state}
      </p>
      <p className="line-clamp-3 text-sm text-muted">{campaign.story}</p>
      <div className="mt-auto space-y-2">
        <ProgressBar value={campaign.raisedCents} max={campaign.goalCents} />
        <div className="flex justify-between text-xs">
          <span className="text-accent">{formatUsd(campaign.raisedCents)} raised</span>
          <span className="text-muted">{formatUsd(campaign.goalCents)} goal</span>
        </div>
        <p className="text-xs text-foreground">
          $50 here saves{' '}
          <span className="text-accent">
            {formatUsd(campaign.impactOfFifty.interestSavedCents)}
          </span>{' '}
          of interest and ends the loan{' '}
          <span className="text-accent">{campaign.impactOfFifty.daysSooner} days</span> sooner.
        </p>
        <p className="label normal-case tracking-normal">
          Paid to {campaign.servicerName}. Never to the borrower.
        </p>
      </div>
      <Link href="/give" className="text-sm text-accent hover:underline">
        Give toward this loan
      </Link>
    </Card>
  );
}

function Hero({ campaigns }: { campaigns: readonly CampaignSummary[] }): React.ReactElement {
  const raised = sumBy(campaigns, (c) => c.raisedCents);
  const paid = sumBy(campaigns, (c) => c.disbursedCents);
  const remaining = sumBy(campaigns, (c) => c.remainingCents);
  return (
    <section className="relative overflow-hidden">
      <div className="dot-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative grid gap-10 py-6 md:grid-cols-[1.3fr_1fr] md:py-12">
        <div className="space-y-6">
          <h1 className="display text-5xl md:text-7xl">
            The loan
            <br />
            gets paid.
          </h1>
          <p className="max-w-xl text-muted">
            Give once. An agent splits the gift, pays the loan servicer by PayPal, and writes every
            cent to a public ledger. The borrower never touches the money.
          </p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/give">Give toward a loan</LinkButton>
            <LinkButton href="/live" variant="secondary">
              Watch money move
            </LinkButton>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border">
          <div className="bg-surface p-5">
            <SystemStatus />
          </div>
          <div className="bg-surface p-5">
            <Stat label="Raised" value={formatUsd(raised)} accent />
          </div>
          <div className="bg-surface p-5">
            <Stat label="Paid to servicers" value={formatUsd(paid)} />
          </div>
          <div className="bg-surface p-5">
            <Stat
              label="Still owed on goals"
              value={formatUsd(remaining)}
              hint={`${campaigns.length} verified campaigns`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function Home(): Promise<React.ReactElement> {
  const campaigns = await loadCampaigns();
  return (
    <div className="space-y-20">
      <Hero campaigns={campaigns ?? []} />

      <section className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border md:grid-cols-3">
        <div className="bg-surface p-6">
          <Stat label="US student loan balances" value="$1.65T" hint="New York Fed, Q2 2026" />
        </div>
        <div className="bg-surface p-6">
          <Stat
            label="Tax-free employer repayment"
            value="$5,250 / yr"
            hint="Now permanent; about 1 in 10 employers offer it"
          />
        </div>
        <div className="bg-surface p-6">
          <Stat
            label="Student-debt fundraisers"
            value="+40% YoY"
            hint="Demand already exists. It just never reaches the servicer."
          />
          <Link href="/why" className="mt-3 inline-block text-sm text-accent hover:underline">
            Why it pays
          </Link>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="display text-3xl">How it works.</h2>
        <div className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.index} className="bg-surface p-6">
              <div className="label mb-4">{s.index}</div>
              <h3 className="display mb-3 text-xl normal-case">{s.title}</h3>
              <p className="text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card index="Built on PayPal">
          <div className="flex flex-wrap gap-2">
            {PAYPAL_PRODUCTS.map((p) => (
              <Badge key={p} tone="accent">
                {p}
              </Badge>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            Every PayPal action is a function-calling tool from the PayPal Agent Toolkit, chosen by
            an agent and shown on screen as it happens.
          </p>
        </Card>
        <Card index="Powered by">
          <div className="flex flex-wrap gap-2">
            {SPONSORS.map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            Elastic matches donor intent to campaigns, AG Grid renders the public ledger, Render
            hosts the app and the agent schedule, Postman monitors health.
          </p>
        </Card>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <h2 className="display text-3xl">Who {APP_NAME} is paying for.</h2>
          <Link href="/give" className="text-sm text-accent hover:underline">
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
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
