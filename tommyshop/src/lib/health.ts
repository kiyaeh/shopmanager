import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';

export interface HealthCheckResult {
  healthy: boolean;
  errors: string[];
}

export interface HealthReport {
  healthy: boolean;
  stockQty: HealthCheckResult;
  balanceDue: HealthCheckResult;
  duplicateReference: HealthCheckResult;
  duplicateImageHash: HealthCheckResult;
  checkedAt: string;
}

async function checkStockQtyInvariant(): Promise<HealthCheckResult> {
  const items = await prisma.item.findMany({ select: { id: true, name: true, stockQty: true } });
  const errors: string[] = [];
  for (const item of items) {
    const agg = await prisma.stockMovement.aggregate({
      where: { itemId: item.id },
      _sum: { qty: true },
    });
    const computed = new Decimal((agg._sum.qty ?? 0).toString());
    const cached = new Decimal(item.stockQty.toString());
    if (!cached.equals(computed)) {
      errors.push(`${item.name}: cached=${cached.toFixed(3)}, computed=${computed.toFixed(3)}`);
    }
  }
  return { healthy: errors.length === 0, errors };
}

async function checkBalanceDueInvariant(): Promise<HealthCheckResult> {
  const sales = await prisma.sale.findMany({
    where: { status: 'COMPLETED' },
    select: { id: true, number: true, total: true, paidAmount: true, balanceDue: true },
  });
  const errors: string[] = [];
  for (const sale of sales) {
    const expected = new Decimal(sale.total.toString()).sub(sale.paidAmount.toString());
    const actual = new Decimal(sale.balanceDue.toString());
    if (!expected.equals(actual) || actual.lt(0)) {
      errors.push(`Sale #${sale.number}: balanceDue=${actual.toFixed(2)}, expected=${expected.toFixed(2)}`);
    }
  }
  return { healthy: errors.length === 0, errors };
}

async function checkDuplicateReferenceInvariant(): Promise<HealthCheckResult> {
  const result = await prisma.$queryRaw<{ bankName: string; reference: string; cnt: bigint }[]>`
    SELECT "bankName", "reference", COUNT(*) as cnt
    FROM "Payment"
    WHERE "bankName" IS NOT NULL AND "reference" IS NOT NULL
    GROUP BY "bankName", "reference"
    HAVING COUNT(*) > 1
  `;
  const errors = result.map(r => `${r.bankName}/${r.reference}: ${r.cnt} duplicates`);
  return { healthy: errors.length === 0, errors };
}

async function checkDuplicateImageHashInvariant(): Promise<HealthCheckResult> {
  const result = await prisma.$queryRaw<{ imageHash: string; cnt: bigint }[]>`
    SELECT "imageHash", COUNT(*) as cnt
    FROM "Payment"
    WHERE "imageHash" IS NOT NULL
    GROUP BY "imageHash"
    HAVING COUNT(*) > 1
  `;
  const errors = result.map(r => `hash ${r.imageHash.slice(0, 12)}…: ${r.cnt} duplicates`);
  return { healthy: errors.length === 0, errors };
}

export async function checkInvariants(): Promise<HealthReport> {
  const [stockQty, balanceDue, duplicateReference, duplicateImageHash] = await Promise.all([
    checkStockQtyInvariant(),
    checkBalanceDueInvariant(),
    checkDuplicateReferenceInvariant(),
    checkDuplicateImageHashInvariant(),
  ]);

  return {
    healthy: stockQty.healthy && balanceDue.healthy && duplicateReference.healthy && duplicateImageHash.healthy,
    stockQty,
    balanceDue,
    duplicateReference,
    duplicateImageHash,
    checkedAt: new Date().toISOString(),
  };
}
