'use client';
import { useState, useTransition } from 'react';
import Image from 'next/image';
import { verifyTransferAction, rejectTransferAction } from './actions';
import { formatETB } from '@/lib/money';
import { formatEthiopian } from '@/lib/ethiopian-date';
import Decimal from 'decimal.js';

export interface TransferSummary {
  id: string;
  amount: string;
  bankName: string | null;
  reference: string | null;
  screenshotUrl: string | null;
  createdAt: string;
  sale: { number: number; businessDate: Date } | null;
  receivedBy: { fullName: string; username: string };
  customer: { name: string } | null;
}

interface TransferCardProps {
  transfer: TransferSummary;
}

export function TransferCard({ transfer }: TransferCardProps) {
  const [pending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [imageExpanded, setImageExpanded] = useState(false);

  function handleVerify() {
    setError(null);
    startTransition(async () => {
      const res = await verifyTransferAction(transfer.id);
      if (!res.ok) setError(res.error);
    });
  }

  function handleReject() {
    if (!reason.trim()) { setError('Reason is required'); return; }
    setError(null);
    startTransition(async () => {
      const res = await rejectTransferAction(transfer.id, reason);
      if (!res.ok) {
        setError(res.error);
      } else {
        setRejectOpen(false);
        setReason('');
      }
    });
  }

  const submittedAt = new Date(transfer.createdAt);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Screenshot panel */}
        <div className="sm:w-48 sm:shrink-0 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center min-h-[160px]">
          {transfer.screenshotUrl ? (
            <button
              onClick={() => setImageExpanded(true)}
              className="relative w-full h-40 sm:h-full overflow-hidden"
              title="View full screenshot"
            >
              <Image
                src={transfer.screenshotUrl}
                alt="Transfer screenshot"
                fill
                className="object-cover"
                unoptimized
              />
            </button>
          ) : (
            <div className="text-zinc-400 text-center p-4">
              <p className="text-3xl mb-1">🖼️</p>
              <p className="text-xs">No screenshot</p>
            </div>
          )}
        </div>

        {/* Details panel */}
        <div className="flex-1 p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-lg">
                ETB {formatETB(new Decimal(transfer.amount))}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {transfer.bankName && (
                  <span className="rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 font-medium">
                    {transfer.bankName}
                  </span>
                )}
                <span className="rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5 font-medium">
                  PENDING
                </span>
              </div>
            </div>
            {transfer.sale && (
              <p className="text-sm text-zinc-500 shrink-0">Sale #{transfer.sale.number}</p>
            )}
          </div>

          <div className="text-sm space-y-1 text-zinc-600 dark:text-zinc-400">
            {transfer.reference && (
              <p><span className="font-medium text-zinc-700 dark:text-zinc-300">Ref:</span> <span className="font-mono">{transfer.reference}</span></p>
            )}
            {transfer.customer && (
              <p><span className="font-medium text-zinc-700 dark:text-zinc-300">Customer:</span> {transfer.customer.name}</p>
            )}
            <p><span className="font-medium text-zinc-700 dark:text-zinc-300">Submitted by:</span> {transfer.receivedBy.fullName} (@{transfer.receivedBy.username})</p>
            {transfer.sale && (
              <p><span className="font-medium text-zinc-700 dark:text-zinc-300">Business date:</span> {formatEthiopian(new Date(transfer.sale.businessDate))}</p>
            )}
            <p><span className="font-medium text-zinc-700 dark:text-zinc-300">At:</span> {submittedAt.toLocaleString()}</p>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-2">{error}</p>}

          {!rejectOpen ? (
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleVerify}
                disabled={pending}
                className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 text-white py-2.5 text-sm font-semibold min-h-[44px] disabled:opacity-50 transition-colors"
              >
                {pending ? 'Processing…' : '✓ Verify'}
              </button>
              <button
                onClick={() => { setRejectOpen(true); setError(null); }}
                disabled={pending}
                className="flex-1 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 py-2.5 text-sm font-semibold min-h-[44px] disabled:opacity-50 transition-colors"
              >
                ✕ Reject
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Rejection reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Reference not found, Wrong amount…"
                  autoFocus
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={pending}
                  className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white py-2.5 text-sm font-semibold min-h-[44px] disabled:opacity-50 transition-colors"
                >
                  {pending ? 'Rejecting…' : 'Confirm Rejection'}
                </button>
                <button
                  onClick={() => { setRejectOpen(false); setError(null); setReason(''); }}
                  disabled={pending}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-400 min-h-[44px] disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full-screen image modal */}
      {imageExpanded && transfer.screenshotUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setImageExpanded(false)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setImageExpanded(false)}
          >
            ✕
          </button>
          <div className="relative max-w-2xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <Image
              src={transfer.screenshotUrl}
              alt="Transfer screenshot full size"
              width={800}
              height={1200}
              className="object-contain rounded-lg max-h-[85vh] w-auto mx-auto"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}
