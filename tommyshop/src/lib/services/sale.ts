import Decimal from 'decimal.js';
import type { PrismaTransaction } from '@/lib/prisma';
import { writeLog } from '@/lib/services/audit';
import { checkDayNotClosed } from '@/lib/services/closing';
import type { CreateSaleInput, VoidSaleInput } from '@/lib/validators/sale';

export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}

const ALLOW_NEGATIVE_STOCK = false;

export async function createSale(
  tx: PrismaTransaction,
  userId: string,
  role: 'ADMIN' | 'SALES',
  input: CreateSaleInput
) {
  // Idempotency
  const existing = await tx.sale.findUnique({ where: { clientId: input.clientId } });
  if (existing) return existing;

  const businessDate = new Date(input.businessDate);

  // Check day not closed
  await checkDayNotClosed(tx, businessDate);

  // Fetch items
  const dbItems = await tx.item.findMany({ where: { id: { in: input.items.map(i => i.itemId) } } });
  const itemMap = new Map(dbItems.map(i => [i.id, i]));

  // Stock validation
  for (const line of input.items) {
    const item = itemMap.get(line.itemId);
    if (!item) throw new BusinessRuleError(`Item ${line.itemId} not found`);
    if (!item.isActive) throw new BusinessRuleError(`Item "${item.name}" is not active`);
    const qty = new Decimal(line.qty);
    const stock = new Decimal(item.stockQty.toString());
    if (qty.gt(stock) && role === 'SALES' && !ALLOW_NEGATIVE_STOCK) {
      throw new BusinessRuleError(
        `Insufficient stock for "${item.name}": available ${stock.toFixed(3)}, requested ${qty.toFixed(3)}`
      );
    }
  }

  // Build line data
  const lines = input.items.map(line => {
    const item = itemMap.get(line.itemId)!;
    const qty = new Decimal(line.qty);
    const unitPrice = new Decimal(line.unitPrice);
    const unitCost = new Decimal(item.avgCost.toString());
    return { item, qty, unitPrice, unitCost, lineTotal: qty.mul(unitPrice) };
  });

  const total = lines.reduce((s, l) => s.add(l.lineTotal), new Decimal(0));
  const totalPaid = input.payments
    .filter(p => p.method === 'CASH')
    .reduce((s, p) => s.add(new Decimal(p.amount)), new Decimal(0));
  const balanceDue = Decimal.max(total.sub(totalPaid), new Decimal(0));

  if (balanceDue.gt(0) && !input.customerId) {
    throw new BusinessRuleError('A customer is required for credit sales (balanceDue > 0)');
  }

  // Credit limit and max debt days checks
  if (balanceDue.gt(0) && input.customerId) {
    const customer = await tx.customer.findUniqueOrThrow({ where: { id: input.customerId } });
    const outstanding = await tx.sale.aggregate({
      where: { customerId: input.customerId, status: 'COMPLETED', balanceDue: { gt: 0 } },
      _sum: { balanceDue: true },
    });
    const currentOutstanding = new Decimal((outstanding._sum.balanceDue ?? 0).toString());
    const creditLimit = new Decimal(customer.creditLimit.toString());

    if (role === 'SALES' && !input.adminOverrideCreditLimit) {
      if (creditLimit.gt(0) && currentOutstanding.add(balanceDue).gt(creditLimit)) {
        throw new BusinessRuleError(
          `Credit limit exceeded. Outstanding: ETB ${currentOutstanding.toFixed(2)}, Limit: ETB ${creditLimit.toFixed(2)}`
        );
      }
    }

    if (customer.maxDebtDays && role === 'SALES' && !input.adminOverrideMaxDebtDays) {
      const cutoff = new Date(businessDate);
      cutoff.setDate(cutoff.getDate() - customer.maxDebtDays);
      const overdueCount = await tx.sale.count({
        where: {
          customerId: input.customerId,
          status: 'COMPLETED',
          balanceDue: { gt: 0 },
          businessDate: { lt: cutoff },
        },
      });
      if (overdueCount > 0) {
        throw new BusinessRuleError(
          `Customer has overdue debt older than ${customer.maxDebtDays} days. New credit is blocked.`
        );
      }
    }
  }

  // Create Sale with SaleItems
  const sale = await tx.sale.create({
    data: {
      clientId: input.clientId,
      businessDate,
      customerId: input.customerId ?? null,
      createdById: userId,
      total,
      paidAmount: totalPaid,
      balanceDue,
      note: input.note ?? null,
      items: {
        create: lines.map(l => ({
          itemId: l.item.id,
          qty: l.qty,
          unitPrice: l.unitPrice,
          unitCost: l.unitCost,
          lineTotal: l.lineTotal,
        })),
      },
    },
  });

  // Create cash payments
  for (const p of input.payments.filter(pay => pay.method === 'CASH')) {
    await tx.payment.create({
      data: {
        kind: 'SALE',
        method: 'CASH',
        amount: new Decimal(p.amount),
        businessDate,
        saleId: sale.id,
        receivedById: userId,
        verifyStatus: 'NOT_REQUIRED',
      },
    });
  }

  // Create SALE movements and update stockQty
  for (const l of lines) {
    await tx.stockMovement.create({
      data: {
        itemId: l.item.id,
        type: 'SALE',
        qty: l.qty.neg(),
        unitCost: l.unitCost,
        refType: 'Sale',
        refId: sale.id,
        businessDate,
        createdById: userId,
      },
    });
    // Update stockQty using Decimal arithmetic
    const currentItem = await tx.item.findUniqueOrThrow({ where: { id: l.item.id } });
    const newStock = new Decimal(currentItem.stockQty.toString()).sub(l.qty);
    await tx.item.update({ where: { id: l.item.id }, data: { stockQty: newStock } });
  }

  return sale;
}

export async function voidSale(
  tx: PrismaTransaction,
  adminId: string,
  input: VoidSaleInput
) {
  const sale = await tx.sale.findUniqueOrThrow({
    where: { id: input.saleId },
    include: { items: true },
  });

  if (sale.status === 'VOIDED') throw new BusinessRuleError('Sale is already voided');

  const before = { status: sale.status, balanceDue: sale.balanceDue.toString() };

  await tx.sale.update({
    where: { id: input.saleId },
    data: {
      status: 'VOIDED',
      voidedAt: new Date(),
      voidedById: adminId,
      voidReason: input.reason,
      balanceDue: new Decimal(0),
    },
  });

  for (const si of sale.items) {
    const qty = new Decimal(si.qty.toString());
    await tx.stockMovement.create({
      data: {
        itemId: si.itemId,
        type: 'SALE_VOID',
        qty,
        unitCost: si.unitCost,
        refType: 'Sale',
        refId: sale.id,
        businessDate: sale.businessDate,
        createdById: adminId,
      },
    });
    const currentItem = await tx.item.findUniqueOrThrow({ where: { id: si.itemId } });
    const newStock = new Decimal(currentItem.stockQty.toString()).add(qty);
    await tx.item.update({ where: { id: si.itemId }, data: { stockQty: newStock } });
  }

  await writeLog(tx, adminId, 'VOID', 'Sale', input.saleId, before, {
    status: 'VOIDED',
    balanceDue: '0',
    voidReason: input.reason,
  });

  return { success: true };
}

export async function getSaleForRole(
  tx: PrismaTransaction,
  saleId: string,
  role: 'ADMIN' | 'SALES'
) {
  const sale = await tx.sale.findUniqueOrThrow({
    where: { id: saleId },
    include: {
      items: { include: { item: { select: { name: true, nameAm: true, unit: true } } } },
      payments: true,
    },
  });

  if (role === 'SALES') {
    return {
      ...sale,
      items: sale.items.map(si => ({ ...si, unitCost: undefined })),
    };
  }
  return sale;
}
