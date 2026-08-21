/**
 * Service Worker 离线拦截（T5 / F-1.6）。
 *
 * 目标：在 T4 离线瓦片（IndexedDB + caoguo-offline 协议）之上，增加一层
 * **网络级二级缓存**——用 Cache API 缓存线上请求的瓦片（天地图等），并在
 * 「空气隔离（air-gap）」模式下拦截所有请求、用 Cache/离线存储兜底，
 * 实现断网后地图仍可平移缩放。
 *
 * 设计：
 * - `resolveCacheKey` / `shouldCache` / `resolveResponse` 是**纯函数 core**，
 *   不依赖真实 ServiceWorker 全局，可在 Node/vitest 中直接测试。
 * - `createFetchHandler` 把 core 包装成标准 `fetch` 事件处理器（注入 cache 与 store）。
 * - 浏览器侧用 `registerServiceWorker` 注册脚本，并通过 postMessage 切换空气隔离模式。
 *
 * 与 T4 的边界：T4 负责「业务离线瓦片 → IndexedDB → maplibre 协议」，
 * 本模块负责「线上瓦片请求 → Cache API 二级缓存 + 空气隔离拦截」，
 * 二者互补：T4 命中时根本不发网络请求（协议层短路），未命中时才走到 SW 缓存。
 */

import { OFFLINE_PROTOCOL, tileKey, type TileStoreBackend } from './storage';

/** 需要二级缓存的瓦片来源（host 白名单，避免缓存无关资源） */
export const CACHEABLE_HOSTS = ['t0.tianditu.gov.cn', 't7.tianditu.gov.cn', 'tianditu.gov.cn'];

/** 缓存名称（版本化，便于失效升级） */
export const CACHE_NAME = 'caoguo-offline-tiles-v1';

/** 空气隔离模式消息协议 */
export const MSG_AIRGAP = 'caoguo:airgap' as const;

export interface AirgapMessage {
  type: typeof MSG_AIRGAP;
  /** true=开启空气隔离（断网模式），false=恢复在线优先 */
  enabled: boolean;
}

/**
 * 判断请求是否应进入离线二级缓存。
 * 只缓存 GET 请求 & 白名单 host & 图片/瓦片类型（保守策略）。
 */
export function shouldCache(request: { method: string; url: string }): boolean {
  if (request.method !== 'GET') return false;
  try {
    const u = new URL(request.url);
    // 离线协议请求（caoguo-offline://）由 T4 处理，不在此缓存
    if (u.protocol === `${OFFLINE_PROTOCOL}:`) return false;
    return CACHEABLE_HOSTS.some((h) => u.host === h || u.host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * 计算 Cache Storage 的 key。优先用 URL（含 query，token 不同视为不同资源），
 * 否则回退到 request 对象本身。
 */
export function resolveCacheKey(request: { url: string }): string {
  return request.url;
}

/**
 * 从存储（IndexedDB/T4 离线）尝试取得瓦片兜底。
 * 用于空气隔离模式下网络不可达时返回上次离线打包的瓦片。
 */
export async function resolveFromStore(
  store: TileStoreBackend | undefined,
  request: { url: string }
): Promise<{ data: ArrayBuffer; contentType: string } | undefined> {
  if (!store) return undefined;
  const z = /TILEMATRIX=(\d+)/.exec(request.url)?.[1];
  const x = /TILECOL=(\d+)/.exec(request.url)?.[1];
  const y = /TILEROW=(\d+)/.exec(request.url)?.[1];
  if (!z || !x || !y) return undefined;
  // 天地图瓦片 key 以 sourceId 前缀；此处用 url 中的 layer 推断 sourceId
  const layer = /LAYER=([a-z]+)/.exec(request.url)?.[1] ?? 'tianditu';
  const key = tileKey(`td-${layer}`, Number(z), Number(x), Number(y));
  const tile = await store.get(key);
  if (!tile) return undefined;
  const buf = tile.data instanceof Uint8Array ? tile.data : new Uint8Array(tile.data);
  return { data: buf.buffer as ArrayBuffer, contentType: 'image/png' };
}

export interface ResolveResponseDeps {
  /** 实际的 fetch 实现（浏览器为全局 fetch，测试可注入） */
  fetchImpl: (input: string) => Promise<{ ok: boolean; status: number; arrayBuffer: () => Promise<ArrayBuffer>; headers: { get: (k: string) => string | null } }>;
  /** Cache 接口（浏览器为全局 caches，测试可注入内存实现） */
  cache: {
    match: (key: string) => Promise<CacheEntry | undefined>;
    put: (key: string, resp: unknown) => Promise<void>;
  };
  /** 空气隔离开关（闭包状态，由消息控制） */
  airgap: { enabled: boolean };
  /** T4 离线存储（可选，空气隔离兜底） */
  store?: TileStoreBackend;
}

interface CacheEntry {
  ok: boolean;
  status: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
  headers: { get: (k: string) => string | null };
}

export interface ResolvedResponse {
  /** 最终响应主体 */
  data: ArrayBuffer;
  /** 内容类型 */
  contentType: string;
  /** 来源：cache=命中缓存 / network=线上最新 / store=离线存储兜底 */
  source: 'cache' | 'network' | 'store';
  /** 该响应是否应写回缓存 */
  cacheable: boolean;
}

/**
 * 核心解析逻辑（纯函数，可测试）。
 * 两种模式：
 * - 在线优先（airgap=false）：cache → network(写回 cache) → store 兜底
 * - 空气隔离（airgap=true）：cache → store 兜底（不发网络请求）
 */
export async function resolveResponse(
  request: { method: string; url: string },
  deps: ResolveResponseDeps
): Promise<ResolvedResponse | null> {
  if (!shouldCache(request)) return null;

  const key = resolveCacheKey(request);

  // 1) Cache 优先
  const cached = await deps.cache.match(key);
  if (cached && cached.ok) {
    return {
      data: await cached.arrayBuffer(),
      contentType: cached.headers.get('content-type') ?? 'image/png',
      source: 'cache',
      cacheable: false,
    };
  }

  // 2) 空气隔离模式：禁止网络，直接走离线存储兜底
  if (deps.airgap.enabled) {
    const fromStore = await resolveFromStore(deps.store, request);
    if (fromStore) {
      return { ...fromStore, source: 'store', cacheable: false };
    }
    return null; // 离线且无任何缓存：放弃（交由上层 404/透明恢复）
  }

  // 3) 在线优先：fetch 并写回 Cache
  try {
    const resp = await deps.fetchImpl(request.url);
    if (resp.ok) {
      const data = await resp.arrayBuffer();
      const contentType = resp.headers.get('content-type') ?? 'image/png';
      // 异步写回缓存（不阻塞响应）
      void deps.cache
        .put(key, {
          ok: true,
          status: resp.status,
          arrayBuffer: async () => data,
          headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? contentType : null) },
        })
        .catch(() => undefined);
      return { data, contentType, source: 'network', cacheable: true };
    }
  } catch {
    // 网络失败：回退 store
    const fromStore = await resolveFromStore(deps.store, request);
    if (fromStore) {
      return { ...fromStore, source: 'store', cacheable: false };
    }
  }
  return null;
}

/**
 * 包装为 Service Worker 的 fetch 事件处理器。
 * 注入真实的 caches / fetch / store。在浏览器 SW 全局中调用：
 *   self.addEventListener('fetch', createFetchHandler({ store }));
 */
export function createFetchHandler(opts: {
  store?: TileStoreBackend;
  airgap?: { enabled: boolean };
}): (event: { request: { method: string; url: string }; respondWith: (r: Promise<Response> | Response) => void }) => void {
  const airgap = opts.airgap ?? { enabled: false };
  return (event) => {
    const request = event.request;
    event.respondWith(
      (async () => {
        const deps: ResolveResponseDeps = {
          fetchImpl: (u) => fetch(u) as unknown as ResolveResponseDeps['fetchImpl'] extends (a: string) => infer R ? R : never,
          cache: caches as unknown as ResolveResponseDeps['cache'],
          airgap,
          store: opts.store,
        };
        const res = await resolveResponse(request, deps);
        if (res) {
          return new Response(res.data, {
            status: 200,
            headers: { 'content-type': res.contentType, 'x-caoguo-source': res.source },
          });
        }
        // 非瓦片请求 / 空气隔离缺失：透明放行
        return fetch(request.url);
      })()
    );
  };
}

/**
 * 在 Service Worker 全局上安装离线拦截逻辑（浏览器 SW 脚本入口）。
 * 处理 install/activate 生命周期、airgap 消息、fetch 拦截。
 */
export function installServiceWorker(sw: {
  addEventListener: (type: string, handler: (ev: unknown) => void) => void;
  caches: unknown;
  store?: TileStoreBackend;
}): { airgap: { enabled: boolean } } {
  const airgap = { enabled: false };

  sw.addEventListener('install', () => {
    // @ts-expect-error 浏览器全局
    sw.skipWaiting?.();
  });
  sw.addEventListener('activate', () => {
    // @ts-expect-error 浏览器全局
    sw.clients?.claim?.();
  });
  sw.addEventListener('message', (ev: unknown) => {
    const msg = ev as { data?: AirgapMessage };
    if (msg.data?.type === MSG_AIRGAP) {
      airgap.enabled = !!msg.data.enabled;
    }
  });
  sw.addEventListener('fetch', createFetchHandler({ store: sw.store, airgap }) as never);

  return { airgap };
}

/**
 * 浏览器端注册离线 Service Worker（主线程调用）。
 * 需要项目提供 SW 脚本文件（见 `sw-template` 注释），并部署到与地图同域根路径。
 *
 * @param scriptUrl SW 脚本 URL（如 '/caoguo-sw.js'），需调用方自行构建/放置
 * @returns 注册成功的 ServiceWorker 实例；不支持时返回 null
 */
export async function registerOfflineServiceWorker(
  scriptUrl: string
): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(scriptUrl);
  } catch {
    return null;
  }
}

/**
 * 向已注册的 Service Worker 发送消息，切换「空气隔离」模式。
 * enabled=true 时地图进入断网可用状态（仅用 Cache + T4 离线存储）。
 */
export function setAirgap(registration: ServiceWorkerRegistration, enabled: boolean): void {
  const ctrl = registration.active ?? registration.installing ?? registration.waiting;
  ctrl?.postMessage({ type: MSG_AIRGAP, enabled } satisfies AirgapMessage as unknown);
}

/**
 * SW 脚本模板（供调用方写入部署文件，如 public/caoguo-sw.js）。
 * 该脚本通过 importScripts 复用本包编译产物，或直接内联 installServiceWorker。
 *
 * ```js
 * // caoguo-sw.js
 * importScripts('/caoguo-offline-sw.bundle.js'); // 含 installServiceWorker
 * installServiceWorker(self);
 * ```
 */
export const SW_TEMPLATE_HINT =
  "importScripts('caoguo-offline-sw.bundle.js'); installServiceWorker(self);";
