'use client';
import { useDateFormat } from '@/components/providers/EthiopianDateProvider';
import { formatEthiopian } from '@/lib/ethiopian-date';

export function DisplayDate({ date }: { date: Date | string }) {
  const { format } = useDateFormat();
  const d = typeof date === 'string' ? new Date(date) : date;

  if (format === 'ethiopian') {
    return <span>{formatEthiopian(d)}</span>;
  }
  return <span>{d.toLocaleDateString('en-GB')}</span>;
}
