'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { applyStockCountAction } from '../actions';

export function ApplyCountButton({ stockCountId }: { stockCountId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleApply() {
    if (!confirm('Apply this stock count? This will adjust inventory levels.')) return;
    startTransition(async () => {
      const res = await applyStockCountAction(stockCountId);
      if (res && 'error' in res) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={handleApply}
      disabled={pending}
      className="rounded-lg bg-green-600 text-white px-3 py-1.5 text-xs font-medium min-h-[36px] disabled:opacity-50"
    >
      {pending ? 'Applying…' : 'Apply Count'}
    </button>
  );
}
