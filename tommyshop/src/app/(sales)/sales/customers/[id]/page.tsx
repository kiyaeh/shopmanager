import { requireRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuthError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { formatETB } from '@/lib/money';
import { formatEthiopian } from '@/lib/ethiopian-date';
import { notFound } from 'next/navigation';
import Decimal from 'decimal.js';
import Link from 'next/link';
import { DebtPaymentForm } from './DebtPaymentForm';

interface Props { params: Promise<{ id: string }> }

export default async function SalesCustomerDetailPage({ params }: Props) {
  try { await requireRole('SALES'); }
  catch (err) { if (err instanceof AuthError) redirect('/login'); throw err; }

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id, isActive: true },
    include: {
      sales: {
        where: { status: 'COMPLETED', balanceDue: { gt: 0 } },
        orderBy: { businessDate: 'asc' },
        include: { items: { include: { item: { select: { name: true } } } } },
      },
    },
  });
  if (!customer) notFound();

  const outstanding = customer.sales.reduce(
    (s, sale) => s.add(sale.balanceDue.toString()),
    new Decimal(0)
  );

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/sales/customers" className="text-zinc-500 text-sm min-h-[44px] flex items-center">← Back</Link>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{customer.name}</h1>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 p-4 text-center">
        <p className="text-sm text-zinc-500">Total Outstanding</p>
        <p className="text-3xl font-bold text-red-600 mt-1">
          {formatETB(outstanding.toFixed(2))} ETB
        </p>
      </div>

      <DebtPaymentForm
        customerId={customer.id}
        outstanding={outstanding.toFixed(2)}
        sales={customer.sales.map(s => ({
          id: s.id,
          number: s.number,
          date: formatEthiopian(new Date(s.businessDate)),
          balanceDue: s.balanceDue.toString(),
          items: s.items.map(si => si.item.name).join(', '),
        }))}
      />
    </div>
  );
}
