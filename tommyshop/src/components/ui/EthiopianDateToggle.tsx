'use client';
import { useDateFormat } from '@/components/providers/EthiopianDateProvider';

export function EthiopianDateToggle() {
  const { format, toggle } = useDateFormat();
  return (
    <button
      onClick={toggle}
      className="text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
    >
      {format === 'ethiopian' ? 'EC' : 'GC'}
    </button>
  );
}
