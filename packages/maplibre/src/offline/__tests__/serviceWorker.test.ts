import { describe, it, expect, vi } from 'vitest';
import {
  shouldCache,
  resolveCacheKey,
  resolveResponse,
  createFetchHandler,
  CACHEABLE_HOSTS,
  MSG_AIRGAP,
  type ResolveResponseDeps,
} from '../serviceWorker';
import { MemoryTileStore } from '../storage';

/** 内存 Cache 实现（模拟浏览器 Cache Storage 单个 cache） */
function makeCache() {
  const map = new Map<string, { ok: boolean; status: number; data: ArrayBuffer; contentType: string }>();
  return {
    match: async (key: string) => {
      const e = map.get(key);
      if (!e) return undefined;
      return {
        ok: e.ok,
        status: e.status,
        arrayBuffer: async () => e.data,
        headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? e.contentType : null) },
      };
    },
    put: async (key: string, resp: any) => {
      map.set(key, {
        ok: resp.ok,
        status: resp.status,
        data: await resp.arrayBuffer(),
        contentType: resp.headers.get('content-type') ?? 'image/png',
      });
    },
    _map: map,
  };
}

const TD_URL =
  'https://t0.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX=10&TILEROW=412&TILECOL=853&tk=TOKEN';

function makeDeps(over: Partial<ResolveResponseDeps> = {}): ResolveResponseDeps {
  const fetchImpl = over.fetchImpl ?? (async () => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => new TextEncoder().encode('NETWORK').buffer,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'image/png' : null) },
  }));
  return {
    fetchImpl,
    cache: over.cache ?? makeCache(),
    airgap: over.airgap ?? { enabled: false },
    store: over.store,
  };
}

describe('serviceWorker T5', () => {
  it('shouldCache 仅接受白名单 GET 请求', () => {
    expect(shouldCache({ method: 'GET', url: TD_URL })).toBe(true);
    expect(shouldCache({ method: 'POST', url: TD_URL })).toBe(false);
    expect(shouldCache({ method: 'GET', url: 'https://example.com/x.png' })).toBe(false);
    expect(
      shouldCache({ method: 'GET', url: 'caoguo-offline://td-img/10/853/412' })
    ).toBe(false); // 离线协议由 T4 处理
  });

  it('CACHEABLE_HOSTS 覆盖天地图子域与根域', () => {
    expect(CACHEABLE_HOSTS.some((h) => 't0.tianditu.gov.cn'.endsWith(h.startsWith('.') ? h : `.${h}`))).toBe(true);
  });

  it('resolveCacheKey 用完整 URL（含 token 区分）', () => {
    expect(resolveCacheKey({ url: TD_URL })).toBe(TD_URL);
  });

  it('在线优先：cache 命中直接返回 cache 来源', async () => {
    const cache = makeCache();
    const buf = new TextEncoder().encode('CACHED').buffer;
    await cache.put(TD_URL, {
      ok: true,
      status: 200,
      arrayBuffer: async () => buf,
      headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'image/png' : null) },
    });
    const res = await resolveResponse({ method: 'GET', url: TD_URL }, makeDeps({ cache }));
    expect(res?.source).toBe('cache');
    expect(new TextDecoder().decode(res!.data)).toBe('CACHED');
  });

  it('在线优先：cache 未命中则 fetch 并写回缓存', async () => {
    const cache = makeCache();
    const spy = vi.fn(makeDeps().fetchImpl);
    const res = await resolveResponse({ method: 'GET', url: TD_URL }, makeDeps({ cache, fetchImpl: spy }));
    expect(res?.source).toBe('network');
    expect(new TextDecoder().decode(res!.data)).toBe('NETWORK');
    expect(spy).toHaveBeenCalledOnce();
    // 写回后再次命中 cache
    const res2 = await resolveResponse({ method: 'GET', url: TD_URL }, makeDeps({ cache }));
    expect(res2?.source).toBe('cache');
  });

  it('空气隔离模式：禁止网络请求，命中 store 兜底', async () => {
    const store = new MemoryTileStore();
    await store.put('td-img:10:853:412', { data: new TextEncoder().encode('STORE').buffer, format: 'png', expires: 0 });
    const fetchImpl = vi.fn(async () => { throw new Error('offline'); });
    const res = await resolveResponse(
      { method: 'GET', url: TD_URL },
      makeDeps({ airgap: { enabled: true }, fetchImpl, store })
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(res?.source).toBe('store');
    expect(new TextDecoder().decode(res!.data)).toBe('STORE');
  });

  it('空气隔离模式：无 cache 无 store 时返回 null（透明放行）', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('offline'); });
    const res = await resolveResponse(
      { method: 'GET', url: TD_URL },
      makeDeps({ airgap: { enabled: true }, fetchImpl })
    );
    expect(res).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('非白名单请求 resolveResponse 返回 null', async () => {
    const res = await resolveResponse({ method: 'GET', url: 'https://example.com/x.png' }, makeDeps());
    expect(res).toBeNull();
  });

  it('在线模式网络失败且无 store：回退为 null', async () => {
    const fetchImpl = async () => ({ ok: false, status: 500, arrayBuffer: async () => new ArrayBuffer(0), headers: { get: () => null } });
    const res = await resolveResponse({ method: 'GET', url: TD_URL }, makeDeps({ fetchImpl }));
    expect(res).toBeNull();
  });

  it('createFetchHandler 包装后可被 respondWith 调用', async () => {
    const cache = makeCache();
    const handler = createFetchHandler({ airgap: { enabled: false } });
    const buf = new TextEncoder().encode('NET').buffer;
    const fetchImpl = async () => ({ ok: true, status: 200, arrayBuffer: async () => buf, headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'image/png' : null) } });
    vi.stubGlobal('fetch', fetchImpl);
    vi.stubGlobal('caches', cache);

    let captured: any = null;
    const fakeEvent = {
      request: { method: 'GET', url: TD_URL },
      respondWith: (r: any) => { captured = r; },
    };
    handler(fakeEvent as any);
    const resp = await captured;
    expect(resp).toBeInstanceOf(Response);
    const body = await resp.arrayBuffer();
    expect(new TextDecoder().decode(body)).toBe('NET');
    vi.unstubAllGlobals();
  });

  it('MSG_AIRGAP 消息类型常量存在', () => {
    expect(MSG_AIRGAP).toBe('caoguo:airgap');
  });
});
