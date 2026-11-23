import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuthError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { formatETB } from '@/lib/money';
import { formatEthiopian } from '@/lib/ethiopian-date';
import { notFound } from 'next/navigation';
import Decimal from 'decimal.js';
import Link from 'next/link';
import { updateCreditSettingsAction, writeOffDebtAction } from '../actions';
import { WriteOffForm } from './WriteOffForm';

interface Props { params: Promise<{ id: string }> }

export default async function CustomerDetailPage({ params }: Props) {
  try { await requireRole('ADMIN'); }
  catch (err) { if (err instanceof AuthError) redirect('/login'); throw err; }

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        where: { status: 'COMPLETED', balanceDue: { gt: 0 } },
        orderBy: { businessDate: 'asc' },
        include: { items: { include: { item: { select: { name: true } } } } },
      },
    },
  });
  if (!customer) notFound();

  const today = new Date();
  const outstanding = customer.sales.reduce(
    (s, sale) => s.add(sale.balanceDue.toString()),
    new Decimal(0)
  );

  // Aging buckets
  const buckets: Record<string, Decimal> = {
    '0-7': new Decimal(0),
    '8-15': new Decimal(0),
    '16-30': new Decimal(0),
    '30+': new Decimal(0),
  };
  for (const sale of customer.sales) {
    const days = Math.floor(
      (today.getTime() - new Date(sale.businessDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const bd = new Decimal(sale.balanceDue.toString());
    if (days <= 7) buckets['0-7'] = buckets['0-7'].add(bd);
    else if (days <= 15) buckets['8-15'] = buckets['8-15'].add(bd);
    else if (days <= 30) buckets['16-30'] = buckets['16-30'].add(bd);
    else buckets['30+'] = buckets['30+'].add(bd);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-0">
      <div className="flex items-center gap-3">
        <Link href="/admin/customers" className="text-zinc-500 hover:text-zinc-700 text-sm">← Customers</Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{customer.name}</h1>
      </div>

      {/* Outstanding + aging */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-zinc-500">Total Outstanding</p>
          <p className={`text-2xl font-bold ${outstanding.gt(0) ? 'text-red-600' : 'text-green-600'}`}>
            {formatETB(outstanding.toFixed(2))} ETB
          </p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(buckets).map(([label, amount]) => (
            <div key={label} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 text-center">
              <p className="text-xs text-zinc-500 mb-1">{label} days</p>
              <p className={`text-sm font-bold ${amount.gt(0) ? 'text-red-600' : 'text-zinc-400'}`}>
                {formatETB(amount.toFixed(2))}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Credit settings */}
      <form action={updateCreditSettingsAction}
        className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
        <h2 className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">Credit Settings</h2>
        <input type="hidden" name="customerId" value={customer.id} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Credit Limit (ETB)</label>
            <input name="creditLimit" type="number" step="0.01" min="0"
              defaultValue={customer.creditLimit.toString()}
              className="w-full rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Max Debt Days</label>
            <input name="maxDebtDays" type="number" min="1"
              defaultValue={customer.maxDebtDays ?? ''}
              placeholder="None"
              className="w-full rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
          </div>
        </div>
        <button type="submit"
          className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700">
          Update Settings
        </button>
      </form>

      {/* Unpaid sales */}
      {customer.sales.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">Unpaid Sales</h2>
          {customer.sales.map((sale) => (
            <div key={sale.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Sale #{sale.number} · {formatEthiopian(new Date(sale.businessDate))}
                </p>
                <p className="text-xs text-zinc-500">
                  {sale.items.map((si) => si.item.name).join(', ')}
                </p>
              </div>
              <p className="text-sm font-bold text-red-600">
                {formatETB(sale.balanceDue.toString())} ETB
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Write off */}
      {outstanding.gt(0) && (
        <WriteOffForm customerId={customer.id} outstanding={formatETB(outstanding.toFixed(2))} />
      )}
    </div>
  );
}
