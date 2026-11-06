import { Card, LinkButton, PageHeader } from '@/components/ui';
import { MARKET_FACTS } from '@/features/market/facts';

const CHANNELS = [
  {
    name: 'Employers',
    body: 'Up to $5,250 a year per employee is tax-free and the rule is now permanent, yet only about one employer in ten offers it. GradPaid is that benefit with no payroll integration: the employer is a sponsor that pays a PayPal invoice, the agent pays the servicer.',
  },
  {
    name: 'Families and friends',
    body: 'Graduation and birthday money that today arrives as cash or a Venmo note can go straight to principal, with a receipt that shows the servicer received it.',
  },
  {
    name: 'Crowds',
    body: 'People already crowdfund student debt on general-purpose platforms, and those fundraisers grew 40% in a year. None of them pay the servicer directly or prove where the money went.',
  },
] as const;

export default function WhyPage(): React.ReactElement {
  return (
    <div className="space-y-16">
      <PageHeader
        title="Why it pays."
        subtitle="Americans owe $1.65 trillion in student loans. Employers, families and strangers already want to pay some of it on someone else's behalf. GradPaid gives that demand a rail that pays the servicer directly, and every dollar on it is a PayPal transaction."
      />

      <section className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border md:grid-cols-3">
        {CHANNELS.map((c) => (
          <div key={c.name} className="bg-surface p-6">
            <h2 className="display mb-3 text-xl normal-case">{c.name}</h2>
            <p className="text-sm text-muted">{c.body}</p>
          </div>
        ))}
      </section>

      <section className="space-y-6">
        <h2 className="display text-3xl">The numbers.</h2>
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-background">
              <tr>
                <th className="label px-4 py-3">Metric</th>
                <th className="label px-4 py-3">Figure</th>
                <th className="label px-4 py-3">As of</th>
                <th className="label px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {MARKET_FACTS.map((f) => (
                <tr key={f.metric}>
                  <td className="px-4 py-3 text-muted">{f.metric}</td>
                  <td className="px-4 py-3 text-foreground">{f.figure}</td>
                  <td className="px-4 py-3 text-muted">{f.asOf}</td>
                  <td className="px-4 py-3">
                    <a
                      href={f.url}
                      className="text-accent hover:underline"
                      rel="noreferrer"
                      target="_blank"
                    >
                      {f.source}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card index="Revenue model">
          <p className="text-sm text-muted">
            A familiar crowdfunding fee of 2.9% + $0.30 per gift. On one employee&apos;s full $5,250
            employer contribution that is $152.55; on a $100 family gift it is $3.20. Processing
            runs on PayPal&apos;s donation pricing, so the margin depends on negotiated rates. This
            is a pricing reference point, not a forecast.
          </p>
        </Card>
        <Card index="Why PayPal wins">
          <p className="text-sm text-muted">
            Every gift is a PayPal Orders capture, every servicer payment is a PayPal Payout, every
            employer match is a PayPal invoice, and every reconciliation reads PayPal Transaction
            Search. The agents add volume to PayPal rails that cash, checks and payroll deductions
            never touch, across a reach of 440 million active accounts.
          </p>
        </Card>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-sm text-muted">
          Honest limits: loan servicers do not accept PayPal today, so the servicer here is a
          sandbox business account. Production needs a servicer partnership or a licensed payments
          partner. The demand above is real either way.
        </p>
        <LinkButton href="/live">Watch the money move</LinkButton>
      </section>
    </div>
  );
}
