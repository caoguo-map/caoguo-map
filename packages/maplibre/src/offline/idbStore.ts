/**
 * IndexedDB 离线瓦片后端（浏览器环境，F-1.4）。
 * 延迟依赖 idb；仅当运行在浏览器时加载，避免 Node/测试环境报错。
 */

import { MemoryTileStore, type StoredTile, type TileStoreBackend } from './storage';

interface RawRow {
  key: string;
  data: ArrayBuffer | Uint8Array;
  format: StoredTile['format'];
  expires: number;
}

let dbPromise: Promise<unknown> | null = null;

function getDb(): Promise<unknown> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const { openDB } = await import('idb');
      return openDB('caoguo-offline', 1, {
        upgrade(db: any) {
          if (!db.objectStoreNames.contains('tiles')) {
            const store = db.createObjectStore('tiles', { keyPath: 'key' });
            store.createIndex('sourceId', 'sourceId');
          }
        },
      });
    })();
  }
  return dbPromise;
}

export class IdbTileStore implements TileStoreBackend {
  async get(key: string): Promise<StoredTile | undefined> {
    const db: any = await getDb();
    const row: RawRow | undefined = await db.get('tiles', key);
    if (!row) return undefined;
    if (row.expires && row.expires < Date.now()) {
      await this.delete(key);
      return undefined;
    }
    return { data: row.data, format: row.format, expires: row.expires };
  }
  async put(key: string, tile: StoredTile): Promise<void> {
    const db: any = await getDb();
    const sourceId = key.split(':')[0];
    await db.put('tiles', {
      key,
      sourceId,
      data: tile.data,
      format: tile.format,
      expires: tile.expires,
    });
  }
  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== undefined;
  }
  async delete(key: string): Promise<void> {
    const db: any = await getDb();
    await db.delete('tiles', key);
  }
  async clear(prefix?: string): Promise<void> {
    const db: any = await getDb();
    if (!prefix) {
      await db.clear('tiles');
      return;
    }
    const tx = db.transaction('tiles', 'readwrite');
    const idx = tx.store.index('sourceId');
    let cursor = await idx.openCursor(prefix);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  }
  async size(): Promise<number> {
    const db: any = await getDb();
    return db.count('tiles');
  }
}

/** 浏览器环境默认用 IndexedDB，否则回退内存 */
export function createDefaultStore(): TileStoreBackend {
  if (typeof indexedDB !== 'undefined') {
    try {
      return new IdbTileStore();
    } catch {
      /* fallthrough */
    }
  }
  return new MemoryTileStore();
}
