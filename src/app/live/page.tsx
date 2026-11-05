import { PageHeader } from '@/components/ui';
import { LiveClient } from './live-client';

export const dynamic = 'force-dynamic';

export default function LivePage(): React.ReactElement {
  return (
    <>
      <PageHeader
        title="Money, moving."
        subtitle="Every tile is a PayPal account. Values come from the append-only ledger and from PayPal itself, refreshed every second and a half while the agents work."
      />
      <LiveClient />
    </>
  );
}
