// IndexedDB 本地存储：缓存专业录取数据，避免每次刷新重新加载和解析 JSON
import type { MajorGroupData } from './types';

const DB_NAME = 'gaokao-group-db';
// DB 版本：每次数据结构或数据源变更时递增，触发 onupgradeneeded 清空旧 store
const DB_VERSION = 2;
const STORE_NAME = 'groupData';
// 数据版本：与数据内容绑定，版本不匹配时缓存失效（强制重新加载）
const DATA_VERSION = 3;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // 版本升级时删除旧 store 重建，清除所有过期缓存
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME, { keyPath: 'subject' });
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
        const row = req.result as { subject: string; data: MajorGroupData[]; ts: number; ver: number } | undefined;
        // 数据版本不匹配则视为缓存失效
        if (!row || row.ver !== DATA_VERSION) {
          resolve(null);
          return;
        }
        resolve(row.data);
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
      store.put({ subject, data, ts: Date.now(), ver: DATA_VERSION });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // 忽略写入失败
  }
}
