import { PageHeader } from '@/components/ui';
import { ConsoleClient } from './console-client';

export const dynamic = 'force-dynamic';

export default function DemoPage(): React.ReactElement {
  return (
    <>
      <PageHeader
        title="Agent console"
        subtitle="Check system health, reset the sandbox demo, and run the disbursement agent. Every PayPal call it makes is shown with its request, response, and reference id."
      />
      <ConsoleClient />
    </>
  );
}
