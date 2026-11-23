import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatETB } from '@/lib/money';
import { formatEthiopian } from '@/lib/ethiopian-date';
import Link from 'next/link';
import Decimal from 'decimal.js';

export default async function TodayPage() {
  await requireRole('SALES');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: { businessDate: today, status: 'COMPLETED' },
    include: {
      items: { include: { item: { select: { name: true, nameAm: true, unit: true } } } },
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
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

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Today</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {formatEthiopian(today)}
          </p>
        </div>
        <Link
          href="/sales/new"
          className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white min-h-[44px] flex items-center hover:bg-indigo-700 transition-colors"
        >
          + New Sale
        </Link>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
          <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Cash</p>
          <p className="text-base font-bold text-green-700 dark:text-green-300 mt-0.5 truncate">
            {formatETB(cashTotal)}
          </p>
        </div>
        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Transfer</p>
          <p className="text-base font-bold text-blue-700 dark:text-blue-300 mt-0.5 truncate">
            {formatETB(transferTotal)}
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Credit</p>
          <p className="text-base font-bold text-amber-700 dark:text-amber-300 mt-0.5 truncate">
            {formatETB(creditTotal)}
          </p>
        </div>
      </div>

      {/* Sales list */}
      <div>
        <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
          Sales ({sales.length})
        </h2>
        {sales.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center">
            <p className="text-zinc-400 dark:text-zinc-500">No sales today</p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">Tap + New Sale to start</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sales.map(sale => {
              const itemsSummary = sale.items
                .map(si => `${si.item.name} ×${new Decimal(si.qty.toString()).toFixed(3)}`)
                .join(', ');
              return (
                <div
                  key={sale.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Sale #{sale.number}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        {itemsSummary}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 shrink-0">
                      ETB {formatETB(sale.total.toString())}
                    </p>
                  </div>
                  {new Decimal(sale.balanceDue.toString()).gt(0) && (
                    <span className="mt-2 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                      Credit: ETB {formatETB(sale.balanceDue.toString())}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
