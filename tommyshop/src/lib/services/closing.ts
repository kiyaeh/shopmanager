import Decimal from 'decimal.js';
import type { PrismaTransaction } from '@/lib/prisma';
import { writeLog } from '@/lib/services/audit';

export class DayClosedError extends Error {
  constructor(message = 'This business day is closed. Contact your admin to reopen it.') {
    super(message);
    this.name = 'DayClosedError';
  }
}

/** Call this at the top of createSale, createPayment, createExpense to block mutations on a closed day */
export async function checkDayNotClosed(tx: PrismaTransaction, businessDate: Date) {
  const closing = await tx.dailyClosing.findUnique({
    where: { businessDate },
    select: { status: true },
  });
  if (closing?.status === 'CLOSED') {
    throw new DayClosedError();
  }
}

/** SALES: submit counted cash. Creates or updates the DailyClosing row for the date. */
export async function submitDayEnd(
  tx: PrismaTransaction,
  salesUserId: string,
  businessDate: Date,
  countedCash: Decimal
) {
  // Compute live totals from DB
  const sales = await tx.sale.findMany({
    where: { businessDate, status: 'COMPLETED' },
    include: { payments: true },
  });

  const expenses = await tx.expense.findMany({
    where: { businessDate, method: 'CASH' },
  });

  let cashReceived = new Decimal(0);
  for (const sale of sales) {
    for (const p of sale.payments) {
      if (p.method === 'CASH') cashReceived = cashReceived.add(p.amount.toString());
    }
  }

  // Also include DEBT cash payments for today
  const debtCashPayments = await tx.payment.findMany({
    where: { businessDate, method: 'CASH', kind: 'DEBT' },
  });
  for (const p of debtCashPayments) {
    cashReceived = cashReceived.add(p.amount.toString());
  }

  const cashExpenses = expenses.reduce(
    (s, e) => s.add(e.amount.toString()),
    new Decimal(0)
  );

  const expectedCash = cashReceived.sub(cashExpenses);
  const cashDifference = countedCash.sub(expectedCash);

  // Upsert the DailyClosing row
  const closing = await tx.dailyClosing.upsert({
    where: { businessDate },
    create: {
      businessDate,
      status: 'OPEN',
      cashReceived,
      cashExpenses,
      expectedCash,
      countedCash,
      cashDifference,
    },
    update: {
      cashReceived,
      cashExpenses,
      expectedCash,
      countedCash,
      cashDifference,
    },
  });

  return closing;
}

/** ADMIN: perform the final close of a business day. */
export async function closeDay(
  tx: PrismaTransaction,
  adminId: string,
  businessDate: Date
) {
  const existing = await tx.dailyClosing.findUnique({ where: { businessDate } });
  if (existing?.status === 'CLOSED') {
    throw new Error('Day is already closed');
  }

  const sales = await tx.sale.findMany({
    where: { businessDate, status: 'COMPLETED' },
    include: { payments: true, items: true },
  });

  const voidedSales = await tx.sale.findMany({
    where: { businessDate, status: 'VOIDED' },
  });

  // Compute snapshot fields
  let totalSales = new Decimal(0);
  let cashReceived = new Decimal(0);
  let transferVerified = new Decimal(0);
  let transferPending = new Decimal(0);
  let creditGiven = new Decimal(0);
  let grossProfit = new Decimal(0);

  for (const sale of sales) {
    totalSales = totalSales.add(sale.total.toString());
    const bd = new Decimal(sale.balanceDue.toString());
    if (bd.gt(0)) creditGiven = creditGiven.add(bd);

    for (const p of sale.payments) {
      if (p.method === 'CASH') cashReceived = cashReceived.add(p.amount.toString());
      if (p.method === 'TRANSFER') {
        if (p.verifyStatus === 'VERIFIED') transferVerified = transferVerified.add(p.amount.toString());
        else if (p.verifyStatus === 'PENDING') transferPending = transferPending.add(p.amount.toString());
      }
    }

    for (const si of sale.items) {
      const qty = new Decimal(si.qty.toString());
      const price = new Decimal(si.unitPrice.toString());
      const cost = new Decimal(si.unitCost.toString());
      grossProfit = grossProfit.add(qty.mul(price.sub(cost)));
    }
  }

  // Debt cash payments collected today
  const debtCashPayments = await tx.payment.findMany({
    where: { businessDate, method: 'CASH', kind: 'DEBT' },
  });
  let debtCollected = new Decimal(0);
  for (const p of debtCashPayments) {
    debtCollected = debtCollected.add(p.amount.toString());
    cashReceived = cashReceived.add(p.amount.toString());
  }

  const expenses = await tx.expense.findMany({ where: { businessDate, method: 'CASH' } });
  const cashExpenses = expenses.reduce((s, e) => s.add(e.amount.toString()), new Decimal(0));
  const expectedCash = cashReceived.sub(cashExpenses);

  const pdfVersion = (existing?.pdfVersion ?? 0) + 1;
  const before = existing ? { status: existing.status } : null;

  const closing = await tx.dailyClosing.upsert({
    where: { businessDate },
    create: {
      businessDate,
      status: 'CLOSED',
      totalSales,
      cashReceived,
      transferVerified,
      transferPending,
      creditGiven,
      debtCollected,
      cashExpenses,
      expectedCash,
      grossProfit,
      pdfVersion,
      closedById: adminId,
      closedAt: new Date(),
    },
    update: {
      status: 'CLOSED',
      totalSales,
      cashReceived,
      transferVerified,
      transferPending,
      creditGiven,
      debtCollected,
      cashExpenses,
      expectedCash,
      grossProfit,
      pdfVersion,
      closedById: adminId,
      closedAt: new Date(),
    },
  });

  await writeLog(tx, adminId, 'CLOSE_DAY', 'DailyClosing', closing.id, before, { status: 'CLOSED', businessDate: businessDate.toISOString() });

  return closing;
}

/** ADMIN: reopen a closed day. */
export async function reopenDay(
  tx: PrismaTransaction,
  adminId: string,
  businessDate: Date,
  reason: string
) {
  if (!reason.trim()) throw new Error('A reason is required to reopen the day');

  const closing = await tx.dailyClosing.findUniqueOrThrow({ where: { businessDate } });
  if (closing.status !== 'CLOSED') throw new Error('Day is not closed');

  const before = { status: closing.status };

  await tx.dailyClosing.update({
    where: { businessDate },
    data: { status: 'OPEN' },
  });

  await writeLog(tx, adminId, 'REOPEN_DAY', 'DailyClosing', closing.id, before, { status: 'OPEN', reason });

  return { success: true };
}
