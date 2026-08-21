/**
 * 离线协议加载器（F-1.4）。
 *
 * 通过 MapLibre `addProtocol('caoguo-offline', loader)` 注册自定义协议，
 * 瓦片源可声明 `tiles: ['caoguo-offline://{sourceId}/{z}/{x}/{y}']`，
 * 引擎即从离线存储读取瓦片，实现「空气隔离」离线底图。
 *
 * MapLibre v4 的 protocol handler 签名：
 *   (requestParameters, abortController) => Promise<{ data: ArrayBuffer }>
 */

import type { AddProtocolAction, RequestParameters } from 'maplibre-gl';
import { parseOfflineUrl, tileKey, OFFLINE_PROTOCOL, type TileStoreBackend } from './storage';

export { OFFLINE_PROTOCOL };

export interface OfflineProtocolContext {
  store: TileStoreBackend;
}

/** 构造离线协议 URL（供 source.tiles 使用） */
export function offlineTileUrl(sourceId: string, z: number, x: number, y: number): string {
  return `${OFFLINE_PROTOCOL}://${encodeURIComponent(sourceId)}/${z}/${x}/${y}`;
}

/** 生成离线栅格/矢量源的 tiles 数组 */
export function offlineSourceTiles(sourceId: string): string[] {
  return [`${OFFLINE_PROTOCOL}://${encodeURIComponent(sourceId)}/{z}/{x}/{y}`];
}

/** 把存储中的瓦片数据规整为 ArrayBuffer */
function toArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (data instanceof Uint8Array) {
    const out = new ArrayBuffer(data.byteLength);
    new Uint8Array(out).set(data);
    return out;
  }
  // ArrayBufferLike 可能含 SharedArrayBuffer，复制为独立 ArrayBuffer
  const src = data as ArrayBuffer;
  const out = new ArrayBuffer(src.byteLength);
  new Uint8Array(out).set(new Uint8Array(src));
  return out;
}

/**
 * 创建离线协议 loader（返回可直接传给 addProtocol 的异步函数）。
 * 未命中瓦片时 reject，由 MapLibre 回退到线上源（若配置）。
 */
export function createOfflineLoader(ctx: OfflineProtocolContext): AddProtocolAction {
  return (params: RequestParameters) => {
    const url = params.url;
    const parsed = parseOfflineUrl(url);
    if (!parsed) {
      return Promise.reject(new Error(`非法离线 URL: ${url}`));
    }
    const key = tileKey(parsed.sourceId, parsed.z, parsed.x, parsed.y);
    return ctx.store.get(key).then((tile) => {
      if (!tile) {
        throw new Error(`离线瓦片缺失: ${key}`);
      }
      return { data: toArrayBuffer(tile.data) };
    });
  };
}

/** 在指定地图实例上注册离线协议 */
export function registerOfflineProtocol(
  maplibregl: { addProtocol: (name: string, action: AddProtocolAction) => void },
  ctx: OfflineProtocolContext
): void {
  maplibregl.addProtocol(OFFLINE_PROTOCOL, createOfflineLoader(ctx));
}
