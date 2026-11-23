'use client';

import { useState, useTransition } from 'react';
import { closeDayAction, reopenDayAction } from './actions';

interface Props {
  dateStr: string;
  status: 'OPEN' | 'CLOSED';
  pdfAdminPath: string | null;
  pdfSalesPath: string | null;
}

export function DayActions({ dateStr, status, pdfAdminPath, pdfSalesPath }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [localStatus, setLocalStatus] = useState(status);

  function handleClose() {
    setError(null);
    startTransition(async () => {
      const result = await closeDayAction(dateStr);
      if (result.ok) {
        setLocalStatus('CLOSED');
      } else {
        setError(result.error ?? 'Failed to close day');
      }
    });
  }

  function handleReopenSubmit() {
    if (!reopenReason.trim()) {
      setError('Reopen reason is required');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await reopenDayAction(dateStr, reopenReason);
      if (result.ok) {
        setLocalStatus('OPEN');
        setShowReopenDialog(false);
        setReopenReason('');
      } else {
        setError(result.error ?? 'Failed to reopen day');
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {localStatus === 'OPEN' ? (
        <button
          onClick={handleClose}
          disabled={isPending}
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 text-base transition-colors"
        >
          {isPending ? 'Closing…' : 'Close Day'}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-green-300 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm font-medium text-green-700 dark:text-green-400">
            ✓ Day is closed
          </div>

          {(pdfAdminPath || pdfSalesPath) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">PDF Reports</p>
              {pdfAdminPath && (
                <a
                  href={`/api/pdf/admin/${encodeURIComponent(dateStr)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  📄 Admin Report PDF
                </a>
              )}
              {pdfSalesPath && (
                <a
                  href={`/api/pdf/sales/${encodeURIComponent(dateStr)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  📄 Sales Report PDF
                </a>
              )}
            </div>
          )}

          <button
            onClick={() => setShowReopenDialog(true)}
            disabled={isPending}
            className="w-full rounded-xl border border-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-400 font-semibold py-3 text-base transition-colors"
          >
            Reopen Day
          </button>
        </div>
      )}

      {showReopenDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Reopen Day</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Please provide a reason for reopening this closed day. This will be recorded in the audit log.
            </p>
            <textarea
              value={reopenReason}
              onChange={e => setReopenReason(e.target.value)}
              placeholder="Reason for reopening…"
              rows={3}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReopenDialog(false);
                  setReopenReason('');
                  setError(null);
                }}
                className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-600 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReopenSubmit}
                disabled={isPending || !reopenReason.trim()}
                className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold py-2 text-sm transition-colors"
              >
                {isPending ? 'Reopening…' : 'Confirm Reopen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
