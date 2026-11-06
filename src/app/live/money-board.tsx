import { formatUsd } from '@/lib/money';
import { AccountTile } from './account-tile';
import type { LivePayload } from './types';

const Arrow = ({ label }: { readonly label: string }): React.ReactElement => (
  <div className="flex flex-col items-center justify-center gap-1 px-1 text-center" aria-hidden>
    <span className="label normal-case tracking-normal text-accent">{label}</span>
    <span className="text-2xl leading-none text-accent">&rarr;</span>
  </div>
);

/** Donor to platform to servicer across PayPal accounts, with the borrower held at zero. */
export function MoneyBoard({ data }: { readonly data: LivePayload }): React.ReactElement {
  const f = data.flows;
  const balance = data.paypalPlatformBalance;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <AccountTile
          account="Donor · PayPal Personal"
          name="Donors gave"
          cents={f.donorsPaidCents}
          caption="Captured with create_order and pay_order"
        />
        <Arrow label="Orders" />
        <AccountTile
          account="GradPaid · PayPal Business"
          name="Held for disbursement"
          cents={f.platformHeldCents}
          caption={
            balance
              ? `PayPal reports ${formatUsd(balance.availableCents)} available in this account`
              : 'PayPal balance check unavailable'
          }
          emphasis
        />
        <Arrow label="Payouts" />
        <AccountTile
          account="Loan servicers · PayPal Business"
          name="Paid to servicers"
          cents={f.servicersReceivedCents}
          caption="Sent by the disbursement agent with send_payout"
          emphasis
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <AccountTile
          account="Employer sponsor · its own agent"
          name="Match paid on PayPal invoice"
          cents={f.sponsorPaidCents}
          caption={`${formatUsd(f.sponsorInvoicedCents)} invoiced by GradPaid's agent, checked and paid by the sponsor's agent`}
          emphasis={f.sponsorPaidCents > 0}
        />
        <AccountTile
          account="Borrower · no PayPal account needed"
          name="Received by the borrower"
          cents={f.borrowerReceivedCents}
          caption="By design. The money never touches the graduate."
          muted
        />
        <AccountTile
          account="Reconciliation · Transaction Search"
          name="Exceptions flagged"
          cents={0}
          caption={`${f.exceptions} mismatch${f.exceptions === 1 ? '' : 'es'} against list_transactions`}
          muted
        />
      </div>
    </div>
  );
}
