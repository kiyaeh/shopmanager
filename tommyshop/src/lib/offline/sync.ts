'use client';
import { getPendingSales, markSaleSynced, incrementSyncAttempts } from './db';

export async function syncQueue(): Promise<void> {
  const pending = await getPendingSales();
  if (pending.length === 0) return;

  for (const sale of pending) {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale),
      });
      if (res.ok || res.status === 409) {
        await markSaleSynced(sale.clientId);
      } else {
        await incrementSyncAttempts(sale.clientId);
      }
    } catch {
      await incrementSyncAttempts(sale.clientId);
    }
  }
}

export function registerSyncOnOnline() {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => { syncQueue(); });
}
