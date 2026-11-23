'use client';
import { useState, useEffect } from 'react';
import { getQueueCount } from '@/lib/offline/db';
import { syncQueue } from '@/lib/offline/sync';

export function SyncBadge() {
  const [count, setCount] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);

    const updateCount = async () => {
      try {
        const n = await getQueueCount();
        setCount(n);
      } catch {
        // IndexedDB not available (SSR guard)
      }
    };

    updateCount();
    const interval = setInterval(updateCount, 5000);

    const handleOnline = () => {
      setOnline(true);
      syncQueue().then(updateCount);
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!online) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Offline
      </span>
    );
  }

  if (count > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        {count} pending
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs px-2 py-0.5 font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Synced
    </span>
  );
}
