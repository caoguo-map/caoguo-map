import { ref } from 'vue';
import type { DataSource } from '../types';
import { normalizeDevice, type DeviceItem } from '../devices';
import { PROXY_TYPES } from '../types';

/**
 * 共享数据连接池（模块级单例）。
 *
 * 解决 P0 #3「连接泄漏」：原本每个组件各自 useDeviceData 都会独立开一个
 * 轮询 / WebSocket / PostMessage 连接；N 个节点引用同一数据源 = N 个连接，
 * 且场景切换 / 预览切换 / 组件卸载时各节点只关自己那份，易泄漏、放大成百上千连接。
 *
 * 这里按「数据源稳定 key」做引用计数：相同数据源全局只建一个连接，所有消费者
 * 共享其数据推送；最后一个消费者卸载时才真正 teardown。
 */

/** 内置示例设备（无后端 / 取数失败时降级，保证可视化可跑） */
const SAMPLE_DEVICES: Record<string, unknown>[] = [
  { id: 'd1', name: '无人农机 A', type: 'machine', status: 'online', lng: 114.305, lat: 30.592, load: 62 },
  { id: 'd2', name: '土壤传感器 1', type: 'soil', status: 'online', lng: 114.312, lat: 30.585, moisture: 41 },
  { id: 'd3', name: '气象站', type: 'weather', status: 'warning', lng: 114.298, lat: 30.578, wind: 12 },
  { id: 'd4', name: '灌溉泵站', type: 'pump', status: 'offline', lng: 114.32, lat: 30.6, flow: 0 },
  { id: 'd5', name: '监控摄像头', type: 'camera', status: 'fault', lng: 114.29, lat: 30.605, fps: 0 },
];

export interface ConnMeta {
  loading: boolean;
  error: string | null;
}
type Consumer = (list: DeviceItem[], meta: ConnMeta) => void;

interface Conn {
  key: string;
  ds: DataSource;
  refCount: number;
  consumers: Set<Consumer>;
  timer: ReturnType<typeof setInterval> | null;
  ws: WebSocket | null;
  pmHandler: ((ev: MessageEvent) => void) | null;
  last: DeviceItem[] | null;
  loading: boolean;
  error: string | null;
}

function resolvePath(data: any, path?: string): any {
  if (!path) return data;
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), data);
}

/** 数据源稳定 key：全局托管用 id（唯一），内联用关键字段哈希 */
function keyOf(ds: DataSource): string {
  if ((ds as any).id) return 'ds:' + (ds as any).id;
  const seed = JSON.stringify({
    t: ds.type,
    u: ds.url,
    h: ds.host,
    p: ds.port,
    db: ds.database,
    q: ds.query,
    src: ds.source,
  });
  return 'inline:' + seed;
}

function useSample(ds: DataSource): DeviceItem[] {
  return SAMPLE_DEVICES.map((d) => normalizeDevice(d as Record<string, any>, ds.mapping));
}

const conns = new Map<string, Conn>();

function broadcast(conn: Conn) {
  const meta: ConnMeta = { loading: conn.loading, error: conn.error };
  const list = conn.last ?? [];
  for (const cb of conn.consumers) cb(list, meta);
}

async function loadOnce(conn: Conn) {
  const ds = conn.ds;
  const mapping = ds.mapping;
  conn.loading = true;
  broadcast(conn);
  try {
    let list: DeviceItem[];
    if (ds.type === 'static' || ds.type === 'excel' || ds.type === 'csv') {
      const arr = Array.isArray(ds.staticData) ? ds.staticData : [];
      list = arr.map((d) => normalizeDevice(d as Record<string, any>, mapping));
    } else if (ds.type === 'rest' && ds.url) {
      const res = await fetch(ds.url, { method: ds.method ?? 'GET', headers: ds.headers });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const arr = resolvePath(json, ds.path);
      if (!Array.isArray(arr)) throw new Error('数据路径未指向数组');
      list = arr.map((d) => normalizeDevice(d as Record<string, any>, mapping));
    } else if (PROXY_TYPES.includes(ds.type) && ds.type !== 'webhook' && ds.url) {
      const body = { type: ds.type, host: ds.host, port: ds.port, database: ds.database, username: ds.username, password: ds.password, query: ds.query };
      const res = await fetch(ds.url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...ds.headers }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const arr = resolvePath(json, ds.path);
      if (!Array.isArray(arr)) throw new Error('数据路径未指向数组');
      list = arr.map((d) => normalizeDevice(d as Record<string, any>, mapping));
    } else if (ds.type === 'webhook' && ds.url) {
      const res = await fetch(ds.url, { headers: ds.headers });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const arr = Array.isArray(json) ? json : resolvePath(json, ds.path) ?? json?.rows ?? [];
      if (!Array.isArray(arr)) throw new Error('数据路径未指向数组');
      list = arr.map((d) => normalizeDevice(d as Record<string, any>, mapping));
    } else {
      // websocket / binding / postmessage(unbound) / 未配置地址：降级示例
      list = useSample(ds);
    }
    conn.last = list;
    conn.error = null;
  } catch (e) {
    conn.error = (e as Error).message;
    conn.last = useSample(ds); // 降级示例，保证可视化不空
  } finally {
    conn.loading = false;
  }
  broadcast(conn);
}

function setupRealtime(conn: Conn) {
  const ds = conn.ds;
  // 轮询：rest / 数据库 / webhook（有 interval 且配置了地址）
  if ((ds.type === 'rest' || (PROXY_TYPES.includes(ds.type) && ds.type !== 'postmessage')) && ds.url && ds.interval && ds.interval > 0) {
    conn.timer = setInterval(() => loadOnce(conn), ds.interval);
  }
  // WebSocket 实时推送
  if (ds.type === 'websocket' && ds.url) {
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(ds.url);
    } catch (e) {
      conn.error = 'WebSocket 连接失败: ' + (e as Error).message;
      broadcast(conn);
      return;
    }
    ws.onmessage = (ev) => {
      try {
        const json = JSON.parse(ev.data);
        const arr = resolvePath(json, ds.path);
        if (Array.isArray(arr)) {
          conn.last = arr.map((d) => normalizeDevice(d as Record<string, any>, ds.mapping));
          conn.error = null;
          broadcast(conn);
        }
      } catch (e) {
        conn.error = 'WebSocket 消息解析失败: ' + (e as Error).message;
        broadcast(conn);
      }
    };
    ws.onerror = () => { conn.error = 'WebSocket 连接错误'; broadcast(conn); };
    conn.ws = ws;
  }
  // PostMessage：监听 window.message
  if (ds.type === 'postmessage') {
    conn.pmHandler = (ev: MessageEvent) => {
      if (ds.sourceOrigin && ev.origin !== ds.sourceOrigin) return;
      const data = ev.data;
      const arr = Array.isArray(data) ? data : resolvePath(data, ds.path);
      if (Array.isArray(arr)) {
        conn.last = arr.map((d) => normalizeDevice(d as Record<string, any>, ds.mapping));
        conn.error = null;
        broadcast(conn);
      }
    };
    window.addEventListener('message', conn.pmHandler);
  }
}

function teardown(conn: Conn) {
  if (conn.timer) clearInterval(conn.timer);
  if (conn.ws) { try { conn.ws.close(); } catch { /* ignore */ } }
  if (conn.pmHandler) window.removeEventListener('message', conn.pmHandler);
  conn.timer = null;
  conn.ws = null;
  conn.pmHandler = null;
}

function startConn(conn: Conn) {
  loadOnce(conn).then(() => setupRealtime(conn));
}

/**
 * 订阅某数据源的数据推送。
 * @returns 取消订阅函数（引用计数 -1，归零时真正关闭连接）。
 */
function subscribe(ds: DataSource, cb: Consumer): () => void {
  const key = keyOf(ds);
  let conn = conns.get(key);
  if (!conn) {
    conn = { key, ds, refCount: 0, consumers: new Set(), timer: null, ws: null, pmHandler: null, last: null, loading: false, error: null };
    conns.set(key, conn);
    startConn(conn);
  }
  conn.refCount++;
  conn.consumers.add(cb);
  // 立即推送已有快照（避免新订阅者干等一轮 polling）
  if (conn.last) cb(conn.last, { loading: conn.loading, error: conn.error });

  return () => {
    const c = conns.get(key);
    if (!c) return;
    c.refCount--;
    c.consumers.delete(cb);
    if (c.refCount <= 0) {
      teardown(c);
      conns.delete(key);
    }
  };
}

export function useDataConnection() {
  return { subscribe, keyOf, _conns: conns };
}
