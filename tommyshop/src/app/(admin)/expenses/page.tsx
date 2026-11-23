import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuthError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { formatETB } from '@/lib/money';
import { formatEthiopian } from '@/lib/ethiopian-date';
import Decimal from 'decimal.js';
import { createExpenseAction } from './actions';

export default async function ExpensesPage() {
  try { await requireRole('ADMIN'); }
  catch (err) { if (err instanceof AuthError) redirect('/login'); throw err; }

  const expenses = await prisma.expense.findMany({
    orderBy: { businessDate: 'desc' },
    take: 50,
    include: { createdBy: { select: { fullName: true } } },
  });

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const total = expenses.reduce((s, e) => s.add(e.amount.toString()), new Decimal(0));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Expenses</h1>

      <form action={async (fd: FormData) => { await createExpenseAction(fd); }} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Date</label>
          <input name="businessDate" type="date" defaultValue={dateStr} required
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Category *</label>
          <input name="category" type="text" required placeholder="transport, salary…"
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Amount (ETB) *</label>
          <input name="amount" type="number" step="0.01" min="0.01" required
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Method</label>
          <select name="method" className="w-full rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800">
            <option value="CASH">Cash</option>
            <option value="TRANSFER">Transfer</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Description</label>
          <input name="description" type="text" placeholder="optional"
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
        </div>
        <div className="col-span-2 md:col-span-5">
          <button type="submit" className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700">
            Add Expense
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="bg-zinc-50 dark:bg-zinc-800 px-4 py-2 flex justify-between text-xs text-zinc-500">
          <span>{expenses.length} expenses</span>
          <span>Total: ETB {formatETB(total.toFixed(2))}</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Date</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Category</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Description</th>
              <th className="text-left px-4 py-3 text-xs uppercase text-zinc-500">Method</th>
              <th className="text-right px-4 py-3 text-xs uppercase text-zinc-500">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {expenses.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-400">No expenses recorded</td></tr>
            ) : expenses.map(e => (
              <tr key={e.id} className="bg-white dark:bg-zinc-900">
                <td className="px-4 py-3 text-zinc-600">{formatEthiopian(new Date(e.businessDate))}</td>
                <td className="px-4 py-3 font-medium">{e.category}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{e.description ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${e.method === 'CASH' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {e.method}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-red-600">
                  -{formatETB(e.amount.toString())}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
