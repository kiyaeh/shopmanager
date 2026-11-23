import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NewSaleForm } from './NewSaleForm';

export default async function NewSalePage() {
  await requireRole('SALES');
  const items = await prisma.item.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, nameAm: true, unit: true, sellPrice: true, stockQty: true },
  });
  // Serialize Decimals to strings for client component
  const serialized = items.map(item => ({
    ...item,
    sellPrice: item.sellPrice.toString(),
    stockQty: item.stockQty.toString(),
  }));
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <NewSaleForm items={serialized} />
    </div>
  );
}
