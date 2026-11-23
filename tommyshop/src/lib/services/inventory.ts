import Decimal from 'decimal.js';
import type { PrismaTransaction } from '@/lib/prisma';
import { prisma } from '@/lib/prisma';
import { writeLog } from '@/lib/services/audit';
import type { CreatePurchaseInput, WasteInput } from '@/lib/validators/inventory';

// ─── Weighted average cost ────────────────────────────────────────────────────

export function computeNewAvgCost(
  oldQty: Decimal,
  oldAvg: Decimal,
  inQty: Decimal,
  inCost: Decimal
): Decimal {
  if (oldQty.lte(0)) return inCost;
  return oldQty.mul(oldAvg).add(inQty.mul(inCost)).div(oldQty.add(inQty));
}

// ─── Record purchase ──────────────────────────────────────────────────────────

export async function recordPurchase(
  tx: PrismaTransaction,
  adminId: string,
  input: CreatePurchaseInput
) {
  const purchaseDate = new Date(input.purchaseDate);

  // Compute totalCost
  const totalCost = input.items.reduce(
    (s, i) => s.add(new Decimal(i.qty).mul(new Decimal(i.unitCost))),
    new Decimal(0)
  );

  const purchase = await tx.purchase.create({
    data: {
      supplierId: input.supplierId ?? null,
      purchaseDate,
      totalCost,
      amountPaid: input.amountPaid ? new Decimal(input.amountPaid) : new Decimal(0),
      note: input.note ?? null,
      createdById: adminId,
    },
  });

  for (const line of input.items) {
    const qty = new Decimal(line.qty);
    const unitCost = new Decimal(line.unitCost);
    const lineTotal = qty.mul(unitCost);

    await tx.purchaseItem.create({
      data: {
        purchaseId: purchase.id,
        itemId: line.itemId,
        qty,
        unitCost,
        lineTotal,
      },
    });

    // Create PURCHASE movement
    await tx.stockMovement.create({
      data: {
        itemId: line.itemId,
        type: 'PURCHASE',
        qty,
        unitCost,
        refType: 'Purchase',
        refId: purchase.id,
        businessDate: purchaseDate,
        createdById: adminId,
      },
    });

    // Update avgCost and stockQty
    const item = await tx.item.findUniqueOrThrow({ where: { id: line.itemId } });
    const oldQty = new Decimal(item.stockQty.toString());
    const oldAvg = new Decimal(item.avgCost.toString());
    const newAvg = computeNewAvgCost(oldQty, oldAvg, qty, unitCost);
    const newStock = oldQty.add(qty);

    const before = { avgCost: oldAvg.toFixed(4), stockQty: oldQty.toFixed(3) };
    await tx.item.update({
      where: { id: line.itemId },
      data: { avgCost: newAvg, stockQty: newStock },
    });
    await writeLog(tx, adminId, 'PURCHASE', 'Item', line.itemId, before, {
      avgCost: newAvg.toFixed(4),
      stockQty: newStock.toFixed(3),
    });
  }

  return purchase;
}

// ─── Record waste ─────────────────────────────────────────────────────────────

export async function recordWaste(
  tx: PrismaTransaction,
  adminId: string,
  input: WasteInput
) {
  const qty = new Decimal(input.qty);
  const businessDate = new Date(input.businessDate);

  const item = await tx.item.findUniqueOrThrow({ where: { id: input.itemId } });
  const currentStock = new Decimal(item.stockQty.toString());
  const newStock = currentStock.sub(qty);

  await tx.stockMovement.create({
    data: {
      itemId: input.itemId,
      type: 'WASTE',
      qty: qty.neg(),
      reason: input.reason + (input.note ? ` — ${input.note}` : ''),
      businessDate,
      createdById: adminId,
    },
  });

  await tx.item.update({
    where: { id: input.itemId },
    data: { stockQty: newStock },
  });

  return { success: true };
}

// ─── Apply stock count ────────────────────────────────────────────────────────

export async function applyStockCount(
  tx: PrismaTransaction,
  adminId: string,
  stockCountId: string
) {
  const stockCount = await tx.stockCount.findUniqueOrThrow({
    where: { id: stockCountId },
    include: { items: true },
  });

  if (stockCount.applied) throw new Error('Stock count already applied');

  for (const countItem of stockCount.items) {
    const diff = new Decimal(countItem.countedQty.toString()).sub(
      new Decimal(countItem.systemQty.toString())
    );

    if (diff.isZero()) continue;

    await tx.stockMovement.create({
      data: {
        itemId: countItem.itemId,
        type: 'COUNT_ADJUSTMENT',
        qty: diff,
        reason: `Stock count ${stockCountId}`,
        refType: 'StockCount',
        refId: stockCountId,
        businessDate: stockCount.countDate,
        createdById: adminId,
      },
    });

    const item = await tx.item.findUniqueOrThrow({ where: { id: countItem.itemId } });
    const newStock = new Decimal(item.stockQty.toString()).add(diff);
    await tx.item.update({ where: { id: countItem.itemId }, data: { stockQty: newStock } });
  }

  await tx.stockCount.update({ where: { id: stockCountId }, data: { applied: true } });
  return { success: true };
}

// ─── Reconcile stock ──────────────────────────────────────────────────────────

export async function reconcileStock(): Promise<
  { itemId: string; name: string; cached: string; computed: string; diff: string }[]
> {
  const items = await prisma.item.findMany({ select: { id: true, name: true, stockQty: true } });
  const discrepancies: { itemId: string; name: string; cached: string; computed: string; diff: string }[] = [];

  for (const item of items) {
    const agg = await prisma.stockMovement.aggregate({
      where: { itemId: item.id },
      _sum: { qty: true },
    });
    const computed = new Decimal((agg._sum.qty ?? 0).toString());
    const cached = new Decimal(item.stockQty.toString());
    const diff = cached.sub(computed);

    if (!diff.isZero()) {
      discrepancies.push({
        itemId: item.id,
        name: item.name,
        cached: cached.toFixed(3),
        computed: computed.toFixed(3),
        diff: diff.toFixed(3),
      });
    }
  }

  return discrepancies;
}
