import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuthError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { formatETB } from '@/lib/money';
import { formatEthiopian } from '@/lib/ethiopian-date';
import Decimal from 'decimal.js';
import Link from 'next/link';

export default async function DashboardPage() {
  try { await requireRole('ADMIN'); }
  catch (err) { if (err instanceof AuthError) redirect('/login'); throw err; }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Today's totals
  const todaySales = await prisma.sale.findMany({
    where: { businessDate: today, status: 'COMPLETED' },
    include: { payments: true, items: true },
  });

  let todayCash = new Decimal(0), todayTransfer = new Decimal(0), todayCredit = new Decimal(0), todayProfit = new Decimal(0);
  for (const sale of todaySales) {
    for (const p of sale.payments) {
      if (p.method === 'CASH') todayCash = todayCash.add(p.amount.toString());
      if (p.method === 'TRANSFER' && p.verifyStatus === 'VERIFIED') todayTransfer = todayTransfer.add(p.amount.toString());
    }
    if (new Decimal(sale.balanceDue.toString()).gt(0)) todayCredit = todayCredit.add(sale.balanceDue.toString());
    for (const si of sale.items) {
      todayProfit = todayProfit.add(new Decimal(si.qty.toString()).mul(new Decimal(si.unitPrice.toString()).sub(si.unitCost.toString())));
    }
  }
  const todayRevenue = todaySales.reduce((s, sale) => s.add(sale.total.toString()), new Decimal(0));

  // Action card counts
  const [pendingTransfers, allActiveItems, openOldDays] = await Promise.all([
    prisma.payment.count({ where: { method: 'TRANSFER', verifyStatus: 'PENDING' } }),
    prisma.item.findMany({
      where: { isActive: true },
      select: { stockQty: true, lowStockLevel: true },
    }),
    prisma.dailyClosing.count({ where: { status: 'OPEN', businessDate: { lt: today } } }),
  ]);

  const lowStockItems = allActiveItems.filter(i =>
    new Decimal(i.stockQty.toString()).lte(new Decimal(i.lowStockLevel.toString()))
  ).length;

  // Overdue customers
  const overdueCustomers = await prisma.customer.count({
    where: {
      isActive: true,
      sales: {
        some: {
          status: 'COMPLETED',
          balanceDue: { gt: 0 },
        },
      },
    },
  });

  // 7-day trend
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const recentSales = await prisma.sale.findMany({
    where: { businessDate: { gte: sevenDaysAgo }, status: 'COMPLETED' },
    include: { payments: true },
    orderBy: { businessDate: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{formatEthiopian(today)}</p>
      </div>

      {/* Today's summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Revenue', value: todayRevenue.toFixed(2) },
          { label: 'Cash', value: todayCash.toFixed(2) },
          { label: 'Transfer', value: todayTransfer.toFixed(2) },
          { label: 'Credit Given', value: todayCredit.toFixed(2) },
          { label: 'Gross Profit', value: todayProfit.toFixed(2) },
          { label: 'Sales Count', value: todaySales.length.toString() },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">{card.label}</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {card.label === 'Sales Count' ? card.value : `ETB ${formatETB(card.value)}`}
            </p>
          </div>
        ))}
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Transfers', count: pendingTransfers, href: '/admin/transfers', urgent: pendingTransfers > 0, icon: '💸' },
          { label: 'Overdue Credit', count: overdueCustomers, href: '/admin/customers', urgent: overdueCustomers > 0, icon: '⚠️' },
          { label: 'Low Stock Items', count: lowStockItems, href: '/admin/inventory', urgent: lowStockItems > 0, icon: '📦' },
          { label: 'Days Not Closed', count: openOldDays, href: '/admin/reports', urgent: openOldDays > 0, icon: '📅' },
        ].map((card) => (
          <Link key={card.label} href={card.href}
            className={`rounded-xl border p-4 hover:shadow-sm transition-shadow ${card.urgent ? 'border-red-200 bg-red-50 dark:bg-red-900/10' : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'}`}>
            <div className="flex items-center justify-between">
              <span className="text-2xl">{card.icon}</span>
              <span className={`text-2xl font-bold ${card.urgent ? 'text-red-600' : 'text-zinc-900 dark:text-zinc-100'}`}>
                {card.count}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-2">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* 7-day trend table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
        <h2 className="font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Last 7 Days</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800">
                <th className="text-left px-3 py-2 text-xs uppercase text-zinc-500">Date</th>
                <th className="text-right px-3 py-2 text-xs uppercase text-zinc-500">Sales</th>
                <th className="text-right px-3 py-2 text-xs uppercase text-zinc-500">Revenue</th>
                <th className="text-right px-3 py-2 text-xs uppercase text-zinc-500">Cash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(sevenDaysAgo);
                d.setDate(d.getDate() + i);
                const daySales = recentSales.filter(s =>
                  new Date(s.businessDate).toDateString() === d.toDateString()
                );
                const rev = daySales.reduce((s, sale) => s.add(sale.total.toString()), new Decimal(0));
                const cash = daySales.reduce((s, sale) => {
                  for (const p of sale.payments) {
                    if (p.method === 'CASH') s = s.add(p.amount.toString());
                  }
                  return s;
                }, new Decimal(0));
                return (
                  <tr key={i}>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{formatEthiopian(d, false)}</td>
                    <td className="px-3 py-2 text-right">{daySales.length}</td>
                    <td className="px-3 py-2 text-right font-medium">{rev.gt(0) ? formatETB(rev.toFixed(2)) : '—'}</td>
                    <td className="px-3 py-2 text-right text-green-600">{cash.gt(0) ? formatETB(cash.toFixed(2)) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
