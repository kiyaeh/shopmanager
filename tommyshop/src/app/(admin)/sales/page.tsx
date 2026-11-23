import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuthError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { formatETB } from '@/lib/money';
import { formatEthiopian } from '@/lib/ethiopian-date';
import Decimal from 'decimal.js';
import Link from 'next/link';

export default async function AdminSalesPage() {
  try { await requireRole('ADMIN'); }
  catch (err) { if (err instanceof AuthError) redirect('/login'); throw err; }

  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      createdBy: { select: { fullName: true } },
      customer: { select: { name: true } },
      payments: { select: { method: true, verifyStatus: true, amount: true } },
      items: { select: { lineTotal: true, item: { select: { name: true } } } },
    },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Sales</h1>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">#</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Date</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Items</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Customer</th>
              <th className="text-right px-4 py-3 text-xs uppercase text-zinc-500">Total</th>
              <th className="text-right px-4 py-3 text-xs uppercase text-zinc-500">Balance Due</th>
              <th className="text-center px-4 py-3 text-xs uppercase text-zinc-500">Status</th>
              <th className="text-center px-4 py-3 text-xs uppercase text-zinc-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {sales.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-zinc-400">No sales</td></tr>
            ) : sales.map(sale => {
              const bd = new Decimal(sale.balanceDue.toString());
              return (
                <tr key={sale.id} className={`${sale.status === 'VOIDED' ? 'opacity-50' : ''} bg-white dark:bg-zinc-900`}>
                  <td className="px-4 py-3 font-mono text-zinc-500 text-xs">#{sale.number}</td>
                  <td className="px-4 py-3 text-zinc-600">{formatEthiopian(new Date(sale.businessDate))}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500 max-w-[180px] truncate">
                    {sale.items.map(si => si.item.name).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{sale.customer?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatETB(sale.total.toString())}</td>
                  <td className={`px-4 py-3 text-right font-medium ${bd.gt(0) ? 'text-red-600' : 'text-zinc-400'}`}>
                    {bd.gt(0) ? formatETB(bd.toFixed(2)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      sale.status === 'VOIDED' ? 'bg-zinc-100 text-zinc-500' : 'bg-green-100 text-green-700'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link href={`/admin/sales/${sale.id}`}
                      className="text-xs text-indigo-600 hover:text-indigo-800">
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
