import { PageHeader } from '@/components/ui';
import { LedgerGrid } from './ledger-grid';

export const dynamic = 'force-dynamic';

export default function LedgerPage(): React.ReactElement {
  return (
    <>
      <PageHeader
        eyebrow="Append-only"
        title="Public ledger."
        subtitle="Every row references a PayPal id or is marked as seeded demo data. The ledger is append-only and reconciled against PayPal transaction history by the disbursement agent."
      />
      <LedgerGrid />
    </>
  );
}
