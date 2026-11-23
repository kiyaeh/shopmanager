'use client';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface QueuedSale {
  clientId: string;
  businessDate: string;
  items: { itemId: string; qty: string; unitPrice: string }[];
  payments: { method: 'CASH' | 'TRANSFER'; amount: string; bankName?: string; reference?: string; screenshotPath?: string; imageHash?: string }[];
  customerId?: string;
  note?: string;
  adminOverrideCreditLimit: boolean;
  adminOverrideMaxDebtDays: boolean;
  status: 'pending' | 'synced' | 'failed';
  attempts: number;
  createdAt: number;
}

interface TommyDBSchema extends DBSchema {
  sales: {
    key: string;
    value: QueuedSale;
    indexes: { 'by-status': string };
  };
}

let dbPromise: Promise<IDBPDatabase<TommyDBSchema>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<TommyDBSchema>('tommy-offline', 1, {
      upgrade(db) {
        const store = db.createObjectStore('sales', { keyPath: 'clientId' });
        store.createIndex('by-status', 'status');
      },
    });
  }
  return dbPromise;
}

export async function queueSale(sale: Omit<QueuedSale, 'status' | 'attempts' | 'createdAt'>) {
  const db = await getDB();
  await db.put('sales', { ...sale, status: 'pending', attempts: 0, createdAt: Date.now() });
}

export async function getPendingSales(): Promise<QueuedSale[]> {
  const db = await getDB();
  return db.getAllFromIndex('sales', 'by-status', 'pending');
}

export async function markSaleSynced(clientId: string) {
  const db = await getDB();
  const sale = await db.get('sales', clientId);
  if (sale) await db.put('sales', { ...sale, status: 'synced' });
}

export async function incrementSyncAttempts(clientId: string) {
  const db = await getDB();
  const sale = await db.get('sales', clientId);
  if (sale) await db.put('sales', { ...sale, attempts: sale.attempts + 1 });
}

export async function getQueueCount(): Promise<number> {
  const db = await getDB();
  return db.countFromIndex('sales', 'by-status', 'pending');
}
