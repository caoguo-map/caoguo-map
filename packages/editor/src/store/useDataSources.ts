import { computed } from 'vue';
import type { DashboardConfig, DataSource, ManagedDataSource, EditorNode } from '../types';
import { genId } from '../components';
import { useEditor } from './useEditor';
import { useHistory } from './useHistory';

/**
 * 全局数据源管理 store（单例）。
 * 数据源集中维护在 DashboardConfig.dataSources，节点通过 dataSourceId 引用，
 * 实现"一处定义、多处复用"。resolveForNode 决定节点最终使用的数据源。
 */

function useEditorConfig(): DashboardConfig {
  return useEditor().state.config;
}

function newManaged(name: string, partial: Partial<DataSource> = {}): ManagedDataSource {
  return {
    id: genId('ds'),
    name,
    type: partial.type ?? 'static',
    ...partial,
  } as ManagedDataSource;
}

export function useDataSources() {
  const { state } = useEditor();
  const { commit } = useHistory();

  const list = computed<ManagedDataSource[]>(() => state.config.dataSources ?? []);

  function ensureArray(): ManagedDataSource[] {
    if (!state.config.dataSources) state.config.dataSources = [];
    return state.config.dataSources;
  }

  function get(id?: string): ManagedDataSource | undefined {
    if (!id) return undefined;
    return list.value.find((d) => d.id === id);
  }

  function create(name: string, partial: Partial<DataSource> = {}): ManagedDataSource {
    commit();
    const arr = ensureArray();
    const ds = newManaged(name, partial);
    arr.push(ds);
    return ds;
  }

  function update(id: string, patch: Partial<DataSource> & { name?: string }) {
    commit();
    const ds = get(id);
    if (!ds) return;
    Object.assign(ds, patch);
  }

  function remove(id: string) {
    commit();
    const arr = ensureArray();
    state.config.dataSources = arr.filter((d) => d.id !== id);
    // 解除所有引用该数据源的节点
    detachReferences(id);
  }

  /** 删除数据源后，清除引用它的节点 dataSourceId（回退到内联 dataSource 或空） */
  function detachReferences(id: string) {
    const cfg = useEditorConfig();
    const clear = (nodes: EditorNode[]) => {
      for (const n of nodes) {
        if (n.dataSourceId === id) n.dataSourceId = undefined;
        if (n.children) clear(n.children as EditorNode[]);
      }
    };
    for (const scene of cfg.scenes) {
      clear(scene.layers as EditorNode[]);
      clear(scene.components as EditorNode[]);
    }
  }

  /** 解析节点最终使用的数据源：优先 dataSourceId → 全局；否则回退内联 dataSource */
  function resolveForNode(node?: EditorNode): DataSource | undefined {
    if (!node) return undefined;
    if (node.dataSourceId) {
      const ds = get(node.dataSourceId);
      if (ds) return ds;
    }
    return node.dataSource;
  }

  /** 节点当前引用名称（用于属性面板展示） */
  function nameForNode(node?: EditorNode): string | undefined {
    if (!node?.dataSourceId) return undefined;
    return get(node.dataSourceId)?.name;
  }

  /** 测试连接：实际拉取一次（rest / 数据库代理 / webhook 探测；websocket 探测；postmessage 提示） */
  async function test(ds: ManagedDataSource): Promise<{ ok: boolean; message: string; count?: number }> {
    try {
      if (ds.type === 'static' || ds.type === 'excel' || ds.type === 'csv') {
        const n = Array.isArray(ds.staticData) ? ds.staticData.length : 0;
        return { ok: true, message: `${ds.type === 'static' ? '静态数据' : ds.type.toUpperCase()} 共 ${n} 行`, count: n };
      }
      if (ds.type === 'binding') {
        return { ok: true, message: `绑定来源：${ds.source ?? '未设置'}` };
      }
      if (ds.type === 'postmessage') {
        return { ok: true, message: '运行时监听 window.postMessage' };
      }
      if (ds.type === 'websocket') {
        if (!ds.url) return { ok: false, message: '未配置 WebSocket 地址' };
        return new Promise((resolve) => {
          let ws: WebSocket;
          try {
            ws = new WebSocket(ds.url!);
          } catch (e) {
            resolve({ ok: false, message: '连接失败：' + (e as Error).message });
            return;
          }
          const done = (ok: boolean, message: string) => {
            try { ws.close(); } catch { /* ignore */ }
            resolve({ ok, message });
          };
          const t = setTimeout(() => done(false, '连接超时'), 4000);
          ws.onopen = () => { clearTimeout(t); done(true, '连接成功'); };
          ws.onerror = () => { clearTimeout(t); done(false, '连接错误'); };
        });
      }
      // rest / webhook / 数据库：经代理 POST 探测
      if (!ds.url) return { ok: false, message: '未配置地址 / 代理地址' };
      const body = ds.type === 'rest'
        ? undefined
        : {
            type: ds.type,
            url: ds.url,
            host: ds.host,
            port: ds.port,
            database: ds.database,
            username: ds.username,
            password: ds.password,
            query: ds.query,
            method: ds.method ?? 'POST',
            webhookUrl: ds.webhookUrl,
          };
      const res = await fetch(ds.url, {
        method: ds.type === 'rest' ? (ds.method ?? 'GET') : 'POST',
        headers: { 'Content-Type': 'application/json', ...ds.headers },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) return { ok: false, message: 'HTTP ' + res.status };
      const json = await res.json().catch(() => null);
      const arr = json && ds.path ? ds.path.split('.').reduce<any>((a: any, k: string) => (a == null ? a : a[k]), json) : json;
      const n = Array.isArray(arr) ? arr.length : 0;
      return { ok: true, message: `连接成功，返回 ${n} 条`, count: n };
    } catch (e) {
      return { ok: false, message: '测试失败：' + (e as Error).message };
    }
  }

  /** 后端数据代理基地址（Webhook 登记 / 数据库代理默认 endpoint） */
  function proxyBase(): string {
    const base = state.config.proxyBase;
    return (base && base.trim()) || 'http://localhost:8787';
  }

  /** 调后端登记 Webhook 接收端点，返回 receiveUrl（供前端轮询取数） */
  async function fetchWebhookUrl(source?: string): Promise<string | null> {
    try {
      const res = await fetch(`${proxyBase()}/api/webhook/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: source ?? '' }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.receiveUrl ?? null;
    } catch {
      return null;
    }
  }

  return {
    list,
    get,
    create,
    update,
    remove,
    resolveForNode,
    nameForNode,
    test,
    proxyBase,
    fetchWebhookUrl,
  };
}
