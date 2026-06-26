// IndexedDB 本地存储：缓存专业组数据，避免每次刷新重新加载和解析 JSON
import type { MajorGroupData } from './types';

const DB_NAME = 'gaokao-group-db';
const DB_VERSION = 1;
const STORE_NAME = 'groupData';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // 以 subject（科类）作为 keyPath
        db.createObjectStore(STORE_NAME, { keyPath: 'subject' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedGroupData(subject: string): Promise<MajorGroupData[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(subject);
      req.onsuccess = () => {
        const row = req.result as { subject: string; data: MajorGroupData[]; ts: number } | undefined;
        resolve(row ? row.data : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedGroupData(subject: string, data: MajorGroupData[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ subject, data, ts: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // 忽略写入失败
  }
}
