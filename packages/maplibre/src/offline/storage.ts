/**
 * 离线瓦片存储抽象层（F-1.4）。
 *
 * 设计：存储后端可插拔。浏览器用 IndexedDB（idb），Node/测试用内存实现。
 * 瓦片 key 统一为 `${sourceId}:${z}:${x}:${y}`，value 为原始字节 + 过期时间。
 */

export type TileFormat = 'pbf' | 'geojson' | 'png' | 'mvt' | 'json';

export interface StoredTile {
  data: ArrayBuffer | Uint8Array;
  format: TileFormat;
  /** 过期时间戳（ms）；0 表示永不过期 */
  expires: number;
}

export interface TileStoreBackend {
  get(key: string): Promise<StoredTile | undefined>;
  put(key: string, tile: StoredTile): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  clear(prefix?: string): Promise<void>;
  size(): Promise<number>;
}

/** 内存实现（测试 / 无 IndexedDB 环境） */
export class MemoryTileStore implements TileStoreBackend {
  private map = new Map<string, StoredTile>();
  async get(key: string) {
    const t = this.map.get(key);
    if (!t) return undefined;
    if (t.expires && t.expires < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return t;
  }
  async put(key: string, tile: StoredTile) {
    this.map.set(key, tile);
  }
  async has(key: string) {
    return (await this.get(key)) !== undefined;
  }
  async delete(key: string) {
    this.map.delete(key);
  }
  async clear(prefix?: string) {
    if (!prefix) {
      this.map.clear();
      return;
    }
    for (const k of [...this.map.keys()]) {
      if (k.startsWith(prefix)) this.map.delete(k);
    }
  }
  async size() {
    return this.map.size;
  }
}

export function tileKey(sourceId: string, z: number, x: number, y: number): string {
  return `${sourceId}:${z}:${x}:${y}`;
}

/** 离线协议名（caoguo-offline://...）。集中定义，供 protocol 与 serviceWorker 共用。 */
export const OFFLINE_PROTOCOL = 'caoguo-offline';

/**
 * 解析离线协议 URL：`caoguo-offline://{sourceId}/{z}/{x}/{y}`
 * 返回 sourceId 与瓦片坐标，便于 ProtocolHandler 取瓦片。
 */
export function parseOfflineUrl(
  url: string
): { sourceId: string; z: number; x: number; y: number } | null {
  const m = /^caoguo-offline:\/\/([^/]+)\/(\d+)\/(\d+)\/(\d+)$/.exec(url);
  if (!m) return null;
  return {
    sourceId: decodeURIComponent(m[1]),
    z: Number(m[2]),
    x: Number(m[3]),
    y: Number(m[4]),
  };
}
