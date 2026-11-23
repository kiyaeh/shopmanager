import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuthError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { formatETB } from '@/lib/money';
import { formatEthiopian } from '@/lib/ethiopian-date';
import Link from 'next/link';

export default async function ReportsPage() {
  try { await requireRole('ADMIN'); }
  catch (err) { if (err instanceof AuthError) redirect('/login'); throw err; }

  const closings = await prisma.dailyClosing.findMany({
    orderBy: { businessDate: 'desc' },
    take: 30,
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Reports</h1>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Date</th>
              <th className="text-center px-4 py-3 text-xs uppercase text-zinc-500">Status</th>
              <th className="text-right px-4 py-3 text-xs uppercase text-zinc-500">Total Sales</th>
              <th className="text-right px-4 py-3 text-xs uppercase text-zinc-500">Cash</th>
              <th className="text-right px-4 py-3 text-xs uppercase text-zinc-500">Profit</th>
              <th className="text-center px-4 py-3 text-xs uppercase text-zinc-500">PDFs</th>
              <th className="text-center px-4 py-3 text-xs uppercase text-zinc-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {closings.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-zinc-400">No closing records yet</td></tr>
            ) : closings.map(c => (
              <tr key={c.id} className="bg-white dark:bg-zinc-900">
                <td className="px-4 py-3 font-medium">{formatEthiopian(new Date(c.businessDate))}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.status === 'CLOSED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>{c.status}</span>
                </td>
                <td className="px-4 py-3 text-right">{formatETB(c.totalSales.toString())}</td>
                <td className="px-4 py-3 text-right text-green-600">{formatETB(c.cashReceived.toString())}</td>
                <td className="px-4 py-3 text-right text-indigo-600">{formatETB(c.grossProfit.toString())}</td>
                <td className="px-4 py-3 text-center space-x-2">
                  {c.pdfAdminPath && (
                    <a href={`/api/pdf/${c.id}`}
                      className="text-xs text-indigo-600 hover:text-indigo-800">Admin</a>
                  )}
                  {c.pdfSalesPath && (
                    <a href={`/api/pdf/${c.id}?role=SALES`}
                      className="text-xs text-zinc-600 hover:text-zinc-800">Sales</a>
                  )}
                  {!c.pdfAdminPath && !c.pdfSalesPath && <span className="text-xs text-zinc-400">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <Link href={`/admin/reports/${c.businessDate.toISOString().slice(0,10)}`}
                    className="text-xs text-indigo-600 hover:text-indigo-800">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
