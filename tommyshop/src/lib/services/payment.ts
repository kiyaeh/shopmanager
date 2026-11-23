import Decimal from 'decimal.js';
import type { PrismaTransaction } from '@/lib/prisma';
import { writeLog } from '@/lib/services/audit';

export class ConflictError extends Error {
  constructor(message: string, public detail?: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export interface CreatePaymentInput {
  kind: 'SALE' | 'DEBT';
  method: 'CASH' | 'TRANSFER';
  amount: string;
  businessDate: Date;
  saleId?: string;
  customerId?: string;
  receivedById: string;
  // Transfer fields
  bankName?: string;
  reference?: string;
  screenshotPath?: string;
  imageHash?: string;
}

export async function createPayment(tx: PrismaTransaction, input: CreatePaymentInput) {
  const amount = new Decimal(input.amount);

  if (input.method === 'TRANSFER') {
    // Check (bankName, reference) duplicate
    if (input.bankName && input.reference) {
      const dupRef = await tx.payment.findUnique({
        where: { bankName_reference: { bankName: input.bankName, reference: input.reference } },
        include: { receivedBy: { select: { username: true, fullName: true } } },
      });
      if (dupRef) {
        throw new ConflictError(
          `Transfer reference already used`,
          `Bank: ${dupRef.bankName}, Ref: ${dupRef.reference} — submitted by ${dupRef.receivedBy.fullName} on ${dupRef.createdAt.toISOString()}`
        );
      }
    }

    // Check imageHash duplicate
    if (input.imageHash) {
      const dupHash = await tx.payment.findUnique({
        where: { imageHash: input.imageHash },
        include: { receivedBy: { select: { username: true, fullName: true } } },
      });
      if (dupHash) {
        throw new ConflictError(
          `Screenshot already used`,
          `Same image was used by ${dupHash.receivedBy.fullName} on ${dupHash.createdAt.toISOString()}`
        );
      }
    }
  }

  const payment = await tx.payment.create({
    data: {
      kind: input.kind,
      method: input.method,
      amount,
      businessDate: input.businessDate,
      saleId: input.saleId ?? null,
      customerId: input.customerId ?? null,
      receivedById: input.receivedById,
      bankName: input.bankName ?? null,
      reference: input.reference ?? null,
      screenshotPath: input.screenshotPath ?? null,
      imageHash: input.imageHash ?? null,
      verifyStatus: input.method === 'TRANSFER' ? 'PENDING' : 'NOT_REQUIRED',
    },
  });

  return payment;
}

export async function verifyTransfer(
  tx: PrismaTransaction,
  adminId: string,
  paymentId: string
) {
  const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.verifyStatus !== 'PENDING') {
    throw new Error('Payment is not in PENDING state');
  }

  const before = { verifyStatus: payment.verifyStatus };
  await tx.payment.update({
    where: { id: paymentId },
    data: { verifyStatus: 'VERIFIED', verifiedById: adminId, verifiedAt: new Date() },
  });

  await writeLog(tx, adminId, 'VERIFY', 'Payment', paymentId, before, { verifyStatus: 'VERIFIED' });

  // If this is a DEBT payment, trigger allocation
  if (payment.kind === 'DEBT' && payment.customerId) {
    await allocateDebtPayment(tx, paymentId, payment.customerId);
  }

  return { success: true };
}

export async function rejectTransfer(
  tx: PrismaTransaction,
  adminId: string,
  paymentId: string,
  reason: string
) {
  const payment = await tx.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: { sale: true },
  });

  const before = { verifyStatus: payment.verifyStatus };
  await tx.payment.update({
    where: { id: paymentId },
    data: { verifyStatus: 'REJECTED', rejectReason: reason, verifiedById: adminId, verifiedAt: new Date() },
  });

  // If sale payment rejected, re-add amount to sale.balanceDue
  if (payment.kind === 'SALE' && payment.saleId) {
    const sale = await tx.sale.findUniqueOrThrow({ where: { id: payment.saleId } });
    const newBalance = new Decimal(sale.balanceDue.toString()).add(payment.amount.toString());
    await tx.sale.update({ where: { id: payment.saleId }, data: { balanceDue: newBalance } });
  }

  await writeLog(tx, adminId, 'REJECT', 'Payment', paymentId, before, { verifyStatus: 'REJECTED', rejectReason: reason });
  return { success: true };
}

export async function allocateDebtPayment(
  tx: PrismaTransaction,
  paymentId: string,
  customerId: string,
  salesOverride?: string[]
) {
  const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });

  // Only CASH or VERIFIED transfers reduce balances
  if (payment.method === 'TRANSFER' && payment.verifyStatus !== 'VERIFIED') return;

  let remaining = new Decimal(payment.amount.toString());

  // Find unpaid sales — oldest first (or override list)
  const unpaidSales = await tx.sale.findMany({
    where: salesOverride
      ? { id: { in: salesOverride }, customerId, status: 'COMPLETED', balanceDue: { gt: 0 } }
      : { customerId, status: 'COMPLETED', balanceDue: { gt: 0 } },
    orderBy: { businessDate: 'asc' },
  });

  for (const sale of unpaidSales) {
    if (remaining.lte(0)) break;
    const bd = new Decimal(sale.balanceDue.toString());
    const allocated = Decimal.min(remaining, bd);

    await tx.paymentAllocation.create({
      data: { paymentId, saleId: sale.id, amount: allocated },
    });

    await tx.sale.update({
      where: { id: sale.id },
      data: {
        balanceDue: bd.sub(allocated),
        paidAmount: new Decimal(sale.paidAmount.toString()).add(allocated),
      },
    });

    remaining = remaining.sub(allocated);
  }
}
