import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatETB } from '@/lib/money';
import { formatEthiopian } from '@/lib/ethiopian-date';
import Decimal from 'decimal.js';
import { EndOfDayForm } from './EndOfDayForm';

export default async function EndOfDayPage() {
  await requireRole('SALES');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: { businessDate: today, status: 'COMPLETED' },
    include: { payments: true },
  });

  let cashTotal = new Decimal(0);
  let transferTotal = new Decimal(0);
  let creditTotal = new Decimal(0);

  for (const sale of sales) {
    for (const p of sale.payments) {
      if (p.method === 'CASH') cashTotal = cashTotal.add(p.amount.toString());
      if (p.method === 'TRANSFER') transferTotal = transferTotal.add(p.amount.toString());
    }
    const bd = new Decimal(sale.balanceDue.toString());
    if (bd.gt(0)) creditTotal = creditTotal.add(bd);
  }

  const expenses = await prisma.expense.findMany({ where: { businessDate: today, method: 'CASH' } });
  const cashExpenses = expenses.reduce((s, e) => s.add(e.amount.toString()), new Decimal(0));
  const expectedCash = cashTotal.sub(cashExpenses);

  const closing = await prisma.dailyClosing.findUnique({ where: { businessDate: today } });

  return (
    <div className="p-4 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">End of Day</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{formatEthiopian(today)}</p>
      </div>

      {closing?.status === 'CLOSED' ? (
        <div className="rounded-xl border border-green-300 bg-green-50 dark:bg-green-900/20 p-5 text-center">
          <p className="text-green-700 dark:text-green-300 font-semibold">✓ Day is closed</p>
          <p className="text-sm text-zinc-500 mt-1">No new entries are allowed</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Today&apos;s Summary</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-zinc-500">Sales ({sales.length})</p><p className="font-semibold">{formatETB(sales.reduce((s, sale) => s.add(sale.total.toString()), new Decimal(0)))}</p></div>
                <div><p className="text-zinc-500">Cash Received</p><p className="font-semibold text-green-700">{formatETB(cashTotal)}</p></div>
                <div><p className="text-zinc-500">Transfer</p><p className="font-semibold text-blue-700">{formatETB(transferTotal)}</p></div>
                <div><p className="text-zinc-500">Credit Given</p><p className="font-semibold text-amber-700">{formatETB(creditTotal)}</p></div>
                <div><p className="text-zinc-500">Cash Expenses</p><p className="font-semibold text-red-600">-{formatETB(cashExpenses)}</p></div>
                <div><p className="text-zinc-500">Expected Cash</p><p className="font-bold text-zinc-900 dark:text-zinc-100">{formatETB(expectedCash)}</p></div>
              </div>
            </div>
          </div>
          <EndOfDayForm expectedCash={expectedCash.toFixed(2)} previousCountedCash={closing?.countedCash?.toString() ?? null} />
        </>
      )}
    </div>
  );
}
