'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { voidSaleAction } from './actions';

export function VoidButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleVoid() {
    if (!reason.trim()) { setError('Reason is required'); return; }
    setError(null);
    startTransition(async () => {
      const res = await voidSaleAction(saleId, reason);
      if (res.ok) { setOpen(false); router.refresh(); }
      else setError(res.error);
    });
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="rounded-lg border border-red-300 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50 min-h-[44px]">
      Void Sale
    </button>
  );

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/10 p-4 space-y-3">
      <p className="text-sm font-semibold text-red-700">Void this sale?</p>
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Reason *</label>
        <input type="text" value={reason} onChange={e => setReason(e.target.value)}
          placeholder="e.g. Entered by mistake"
          className="w-full rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button onClick={handleVoid} disabled={pending}
          className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium min-h-[44px] disabled:opacity-50">
          {pending ? 'Voiding…' : 'Confirm Void'}
        </button>
        <button onClick={() => { setOpen(false); setError(null); }}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 min-h-[44px]">
          Cancel
        </button>
      </div>
    </div>
  );
}
