import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatEthiopian } from '@/lib/ethiopian-date';
import Decimal from 'decimal.js';
import { StockCountForm } from './StockCountForm';
import { ApplyCountButton } from './ApplyCountButton';

export default async function StockCountsPage() {
  await requireRole('ADMIN');

  const items = await prisma.item.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, nameAm: true, unit: true, stockQty: true },
  });

  const pastCounts = await prisma.stockCount.findMany({
    orderBy: { countDate: 'desc' },
    take: 20,
    include: {
      items: { include: { item: { select: { name: true } } } },
      createdBy: { select: { fullName: true } },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Stock Counts</h1>

      <StockCountForm
        items={items.map(i => ({
          id: i.id,
          name: i.name,
          nameAm: i.nameAm,
          unit: i.unit,
          systemQty: i.stockQty.toString(),
        }))}
      />

      {pastCounts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase">Past Counts</h2>
          {pastCounts.map(count => (
            <div key={count.id} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">{formatEthiopian(count.countDate)}</p>
                  <p className="text-xs text-zinc-500">By {count.createdBy.fullName}</p>
                </div>
                <div className="flex items-center gap-3">
                  {count.applied ? (
                    <span className="rounded-full bg-green-100 text-green-700 text-xs px-2 py-0.5">Applied</span>
                  ) : (
                    <ApplyCountButton stockCountId={count.id} />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-zinc-600">
                {count.items.map(ci => {
                  const diff = new Decimal(ci.countedQty.toString()).sub(ci.systemQty.toString());
                  return (
                    <div key={ci.id} className={`flex justify-between p-2 rounded ${diff.isZero() ? '' : diff.gt(0) ? 'bg-green-50' : 'bg-red-50'}`}>
                      <span>{ci.item.name}</span>
                      <span className={diff.isZero() ? 'text-zinc-500' : diff.gt(0) ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {diff.gt(0) ? '+' : ''}{diff.toFixed(3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
