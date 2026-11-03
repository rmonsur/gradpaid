import { PageHeader } from '@/components/ui';
import { GiveClient } from './give-client';

export default function GivePage(): React.ReactElement {
  return (
    <div>
      <PageHeader
        eyebrow="Giving agent"
        title="Give toward a loan."
        subtitle="Tell the giving agent who you want to help. It finds verified campaigns, proposes a split, and creates one PayPal order. Every PayPal call shows on the right."
      />
      <GiveClient />
    </div>
  );
}
