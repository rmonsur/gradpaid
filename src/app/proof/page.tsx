import { PageHeader } from '@/components/ui';
import { ProofClient } from './proof-client';

export const dynamic = 'force-dynamic';

export default async function ProofPage({
  searchParams,
}: PageProps<'/proof'>): Promise<React.ReactElement> {
  const params = await searchParams;
  const initialRef = typeof params.ref === 'string' ? params.ref : '';
  return (
    <>
      <PageHeader
        title="Follow the money."
        subtitle="Paste any PayPal reference from a receipt or the ledger: an order id, a capture id or a payout batch id. You will see where every cent went, with PayPal's own status for each payout."
      />
      <ProofClient initialRef={initialRef} />
    </>
  );
}
