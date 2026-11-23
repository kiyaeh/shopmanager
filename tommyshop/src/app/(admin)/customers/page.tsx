import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuthError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { formatETB } from '@/lib/money';
import Decimal from 'decimal.js';
import Link from 'next/link';
import { createCustomerAction } from './actions';

export default async function CustomersPage() {
  try { await requireRole('ADMIN'); }
  catch (err) { if (err instanceof AuthError) redirect('/login'); throw err; }

  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      sales: {
        where: { status: 'COMPLETED' },
        select: { balanceDue: true, businessDate: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Customers</h1>

      <form action={async (fd: FormData) => { await createCustomerAction(fd); }} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Name *</label>
          <input name="name" type="text" required placeholder="Customer name"
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Phone</label>
          <input name="phone" type="text" placeholder="+251…"
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Credit Limit (ETB)</label>
          <input name="creditLimit" type="number" step="0.01" min="0" placeholder="0.00"
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Max Debt Days</label>
          <input name="maxDebtDays" type="number" min="1" placeholder="e.g. 30"
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
        </div>
        <div className="col-span-2 md:col-span-4">
          <button type="submit"
            className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700">
            Add Customer
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Name</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Phone</th>
              <th className="text-right px-4 py-3 text-xs uppercase text-zinc-500">Outstanding</th>
              <th className="text-right px-4 py-3 text-xs uppercase text-zinc-500">Credit Limit</th>
              <th className="text-center px-4 py-3 text-xs uppercase text-zinc-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {customers.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-400">No customers yet</td></tr>
            ) : customers.map((c) => {
              const outstanding = c.sales.reduce(
                (s, sale) => s.add(sale.balanceDue.toString()),
                new Decimal(0)
              );
              const isOverLimit = new Decimal(c.creditLimit.toString()).gt(0) &&
                outstanding.gt(c.creditLimit.toString());
              return (
                <tr key={c.id}
                  className={isOverLimit ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-zinc-900'}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{c.name}</td>
                  <td className="px-4 py-3 text-zinc-500">{c.phone ?? '—'}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${outstanding.gt(0) ? 'text-red-600' : 'text-green-600'}`}>
                    {formatETB(outstanding.toFixed(2))} ETB
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-500">
                    {formatETB(c.creditLimit.toString())} ETB
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link href={`/admin/customers/${c.id}`}
                      className="text-xs text-indigo-600 hover:text-indigo-800">
                      View →
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
