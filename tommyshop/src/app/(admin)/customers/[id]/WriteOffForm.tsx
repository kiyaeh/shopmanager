'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { writeOffDebtAction } from '../actions';

interface Props { customerId: string; outstanding: string; }

export function WriteOffForm({ customerId, outstanding }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!reason.trim()) { setError('Reason is required'); return; }
    setError(null);
    const fd = new FormData();
    fd.set('customerId', customerId);
    fd.set('reason', reason);
    startTransition(async () => {
      const res = await writeOffDebtAction(fd);
      if (res && 'error' in res) {
        setError(res.error ?? null);
      } else {
        setOpen(false);
        setReason('');
        router.refresh();
      }
    });
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-full rounded-lg border border-red-300 text-red-600 py-3 text-sm font-medium hover:bg-red-50 transition-colors">
      Write Off Debt ({outstanding} ETB)
    </button>
  );

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/10 p-4 space-y-3">
      <p className="text-sm font-semibold text-red-700">Write Off {outstanding} ETB</p>
      <p className="text-xs text-zinc-500">This will zero the outstanding balance. This action is logged and cannot be undone.</p>
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Reason *</label>
        <input type="text" value={reason} onChange={e => setReason(e.target.value)}
          placeholder="e.g. Customer deceased, bad debt cleared…"
          className="w-full rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button onClick={handleSubmit} disabled={pending}
          className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium min-h-[44px] disabled:opacity-50">
          {pending ? 'Processing…' : 'Confirm Write Off'}
        </button>
        <button onClick={() => { setOpen(false); setError(null); }}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 min-h-[44px]">
          Cancel
        </button>
      </div>
    </div>
  );
}
