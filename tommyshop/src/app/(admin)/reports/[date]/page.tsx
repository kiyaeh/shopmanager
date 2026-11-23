import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatETB } from '@/lib/money';
import { formatEthiopian } from '@/lib/ethiopian-date';
import { notFound } from 'next/navigation';
import Decimal from 'decimal.js';
import { CloseDayControls } from './CloseDayControls';

interface Props { params: Promise<{ date: string }>; }

export default async function DayReportPage({ params }: Props) {
  await requireRole('ADMIN');
  const { date } = await params;
  const businessDate = new Date(date);
  if (isNaN(businessDate.getTime())) notFound();
  businessDate.setHours(0, 0, 0, 0);

  const closing = await prisma.dailyClosing.findUnique({ where: { businessDate } });

  const sales = await prisma.sale.findMany({
    where: { businessDate, status: 'COMPLETED' },
    include: { items: { include: { item: { select: { name: true } } } }, payments: true },
    orderBy: { number: 'asc' },
  });

  const totalRevenue = sales.reduce((s, sale) => s.add(sale.total.toString()), new Decimal(0));
  const pendingTransfers = await prisma.payment.count({ where: { businessDate, method: 'TRANSFER', verifyStatus: 'PENDING' } });

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Daily Report — {formatEthiopian(businessDate)}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{businessDate.toDateString()}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${closing?.status === 'CLOSED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {closing?.status ?? 'OPEN'}
        </span>
      </div>

      {pendingTransfers > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-300 p-4 text-sm text-amber-700">
          ⚠️ {pendingTransfers} transfer{pendingTransfers > 1 ? 's' : ''} pending verification
        </div>
      )}

      {closing && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            ['Total Sales', closing.totalSales.toString()],
            ['Cash Received', closing.cashReceived.toString()],
            ['Transfer Verified', closing.transferVerified.toString()],
            ['Transfer Pending', closing.transferPending.toString()],
            ['Credit Given', closing.creditGiven.toString()],
            ['Debt Collected', closing.debtCollected.toString()],
            ['Cash Expenses', closing.cashExpenses.toString()],
            ['Expected Cash', closing.expectedCash.toString()],
            ['Counted Cash', closing.countedCash?.toString() ?? '—'],
            ['Cash Difference', closing.cashDifference?.toString() ?? '—'],
            ['Gross Profit', closing.grossProfit.toString()],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="font-semibold text-sm">{value === '—' ? '—' : `ETB ${formatETB(value)}`}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="text-left px-4 py-2 text-xs uppercase text-zinc-500">Sale</th>
              <th className="text-left px-4 py-2 text-xs uppercase text-zinc-500">Items</th>
              <th className="text-right px-4 py-2 text-xs uppercase text-zinc-500">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {sales.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-zinc-400">No sales</td></tr>
            ) : sales.map(sale => (
              <tr key={sale.id} className="bg-white dark:bg-zinc-900">
                <td className="px-4 py-2">#{sale.number}</td>
                <td className="px-4 py-2 text-zinc-500 text-xs">{sale.items.map(si => si.item.name).join(', ')}</td>
                <td className="px-4 py-2 text-right font-medium">{formatETB(sale.total.toString())}</td>
              </tr>
            ))}
            <tr className="bg-zinc-50 dark:bg-zinc-800 font-bold">
              <td className="px-4 py-2" colSpan={2}>Total</td>
              <td className="px-4 py-2 text-right">{formatETB(totalRevenue.toFixed(2))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <CloseDayControls date={date} isClosed={closing?.status === 'CLOSED'} pdfAdminPath={closing?.pdfAdminPath ?? null} pdfSalesPath={closing?.pdfSalesPath ?? null} closingId={closing?.id ?? null} />
    </div>
  );
}
