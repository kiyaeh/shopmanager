import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuthError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { formatETB } from '@/lib/money';
import Decimal from 'decimal.js';
import Link from 'next/link';

export default async function SalesCustomersPage() {
  try { await requireRole('SALES'); }
  catch (err) { if (err instanceof AuthError) redirect('/login'); throw err; }

  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      sales: {
        where: { status: 'COMPLETED', balanceDue: { gt: 0 } },
        select: { balanceDue: true },
      },
    },
  });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Customers</h1>

      <div className="space-y-3">
        {customers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
            <p className="text-zinc-400">No customers yet</p>
          </div>
        ) : customers.map((c) => {
          const outstanding = c.sales.reduce(
            (s, sale) => s.add(sale.balanceDue.toString()),
            new Decimal(0)
          );
          return (
            <div key={c.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{c.name}</p>
                {c.phone && <p className="text-xs text-zinc-500">{c.phone}</p>}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-sm font-bold ${outstanding.gt(0) ? 'text-red-600' : 'text-green-600'}`}>
                    {formatETB(outstanding.toFixed(2))} ETB
                  </p>
                  <p className="text-xs text-zinc-500">outstanding</p>
                </div>
                {outstanding.gt(0) && (
                  <Link href={`/sales/customers/${c.id}`}
                    className="rounded-lg bg-green-600 text-white px-4 py-3 text-sm font-semibold min-h-[44px] flex items-center hover:bg-green-700 transition-colors">
                    Receive Payment
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
