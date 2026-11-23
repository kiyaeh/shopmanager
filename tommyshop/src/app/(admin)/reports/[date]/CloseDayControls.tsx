'use client';
import { useState, useTransition } from 'react';
import { closeDayAction, reopenDayAction } from './actions';

interface Props {
  date: string;
  isClosed: boolean;
  pdfAdminPath: string | null;
  pdfSalesPath: string | null;
  closingId: string | null;
}

export function CloseDayControls({ date, isClosed, pdfAdminPath, pdfSalesPath, closingId }: Props) {
  const [pending, startTransition] = useTransition();
  const [reopenReason, setReopenReason] = useState('');
  const [showReopen, setShowReopen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setError(null);
    startTransition(async () => {
      const res = await closeDayAction(date);
      if (!res.ok) setError(res.error);
    });
  }

  function handleReopen() {
    if (!reopenReason.trim()) { setError('Reason is required'); return; }
    setError(null);
    startTransition(async () => {
      const res = await reopenDayAction(date, reopenReason);
      if (!res.ok) setError(res.error);
      else { setShowReopen(false); setReopenReason(''); }
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-3">{error}</p>}

      {closingId && (
        <div className="flex gap-3">
          {pdfAdminPath && (
            <a href={`/api/pdf/${closingId}?role=ADMIN`} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 transition-colors">
              ↓ Admin PDF
            </a>
          )}
          {pdfSalesPath && (
            <a href={`/api/pdf/${closingId}?role=SALES`} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 transition-colors">
              ↓ Sales PDF
            </a>
          )}
        </div>
      )}

      {!isClosed ? (
        <button onClick={handleClose} disabled={pending}
          className="w-full rounded-xl bg-green-600 text-white py-3 font-semibold min-h-[48px] disabled:opacity-50">
          {pending ? 'Closing…' : 'Close Day'}
        </button>
      ) : showReopen ? (
        <div className="space-y-3">
          <input type="text" value={reopenReason} onChange={e => setReopenReason(e.target.value)}
            placeholder="Reason for reopening…"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm" />
          <div className="flex gap-3">
            <button onClick={handleReopen} disabled={pending}
              className="flex-1 rounded-lg bg-amber-600 text-white py-2 font-semibold min-h-[44px] disabled:opacity-50">
              {pending ? 'Reopening…' : 'Confirm Reopen'}
            </button>
            <button onClick={() => setShowReopen(false)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm min-h-[44px]">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowReopen(true)}
          className="w-full rounded-xl border border-amber-400 text-amber-700 py-3 font-semibold min-h-[48px] hover:bg-amber-50 transition-colors">
          Reopen Day
        </button>
      )}
    </div>
  );
}
