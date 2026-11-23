'use client';
import { useState, useEffect } from 'react';

export function SyncBadge() {
  // Use null as initial state to avoid hydration mismatch
  // null = not yet mounted (server), then update on client
  const [online, setOnline] = useState<boolean | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Now we're on the client
    setOnline(navigator.onLine);

    const updateCount = async () => {
      try {
        const { getQueueCount } = await import('@/lib/offline/db');
        const n = await getQueueCount();
        setCount(n);
      } catch {
        // IndexedDB not available
      }
    };

    updateCount();
    const interval = setInterval(updateCount, 5000);

    const handleOnline = () => {
      setOnline(true);
      import('@/lib/offline/sync').then(m => m.syncQueue()).then(updateCount);
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

  // Don't render anything until client-side mounted (prevents hydration mismatch)
  if (online === null) return null;

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
