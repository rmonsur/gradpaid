import { config } from 'dotenv';
import { runDisbursementAgent } from '@/lib/agents/disbursement-agent';

config({ path: '.env.local' });

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const result = await runDisbursementAgent('cli', dryRun);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
