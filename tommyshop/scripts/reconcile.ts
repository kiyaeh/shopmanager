import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { reconcileStock } from '../src/lib/services/inventory';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Running stock reconciliation…\n');
  const discrepancies = await reconcileStock();

  if (discrepancies.length === 0) {
    console.log('✓ All items balanced — no discrepancies found.');
  } else {
    console.log(`⚠ Found ${discrepancies.length} discrepancy/discrepancies:\n`);
    console.log('Item ID'.padEnd(38) + 'Name'.padEnd(20) + 'Cached'.padEnd(12) + 'Computed'.padEnd(12) + 'Diff');
    console.log('-'.repeat(90));
    for (const d of discrepancies) {
      console.log(
        d.itemId.padEnd(38) +
        d.name.padEnd(20) +
        d.cached.padEnd(12) +
        d.computed.padEnd(12) +
        d.diff
      );
    }
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Reconcile failed:', err);
  process.exit(1);
});
