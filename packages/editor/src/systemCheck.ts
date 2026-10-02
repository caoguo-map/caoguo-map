/**
 * 系统自检·静态体检（PRD visual-editor §3.6 的数据层）
 *
 * 原先这段逻辑全部内联在 `SystemCheck.vue` 里，无法单测。按本项目惯例
 * （先抽出可单测的纯函数，组件只做薄壳）拆到这里。
 *
 * 只做**静态**检查：不发起任何网络请求（数据源连通性由 `SystemCheck.vue` 的
 * `runConnectionCheck` 单独负责）。
 */

import type {
  DashboardConfig,
  DataSource,
  EditorNode,
  ManagedDataSource,
  MapLayer,
  Scene,
} from './types';

export type CheckLevel = 'error' | 'warn' | 'info' | 'ok';

export interface CheckItem {
  level: CheckLevel;
  group: string;
  title: string;
  detail?: string;
}

export interface StaticCheckInput {
  config: DashboardConfig;
  /** 全局托管数据源（用于校验 `dataSourceId` 引用是否存在） */
  managedSources?: ManagedDataSource[];
}

/** 使用 `config.deviceLayerId` 绑定设备图层的组件类型 */
const DEVICE_BOUND_TYPES = ['device-list', 'detail-panel', 'filter-tabs', 'alert-list'];

/** 图表类型（binding 聚合需要 field 才有意义） */
const CHART_TYPES = ['trend-chart', 'bar-chart', 'pie-chart', 'gauge-chart', 'wind-rose'];

/** 需要 field 的聚合方式（count / status-count 不依赖具体字段） */
const FIELD_REQUIRED_AGGREGATES = ['avg', 'sum', 'max', 'min'];

/** 判断数据源是否配置了可取数内容 */
function hasFetchable(src: DataSource | undefined): boolean {
  if (!src) return false;
  return (
    src.staticData !== undefined ||
    !!src.url ||
    !!src.query ||
    !!src.source ||
    !!src.host ||
    src.type === 'postmessage' ||
    src.type === 'websocket'
  );
}

function posOf(node: EditorNode): { x: number; y: number; w: number; h: number } {
  const p = (node as { position?: { x?: number; y?: number; w?: number; h?: number } }).position ?? {};
  return { x: p.x ?? 0, y: p.y ?? 0, w: p.w ?? 0, h: p.h ?? 0 };
}

/**
 * 静态体检：配置完整性 / 引用一致性 / 越界 / 阈值与绑定配置。
 * @returns 检查项列表（首项为概览）
 */
export function runStaticCheck(input: StaticCheckInput): CheckItem[] {
  const list: CheckItem[] = [];
  const cfg = input.config;
  const managed = input.managedSources ?? [];
  const scenes: Scene[] = Array.isArray(cfg.scenes) ? cfg.scenes : [];
  const cw = cfg.canvas?.width ?? 1920;
  const ch = cfg.canvas?.height ?? 1080;

  if (scenes.length === 0) {
    list.push({ level: 'error', group: '配置', title: '没有场景', detail: '至少需有一个场景才能投放大屏。' });
  }

  // ── 场景 key：缺失 / 重复 ──
  const keySeen = new Map<string, number>();
  for (const s of scenes) {
    const key = (s.key ?? '').trim();
    if (!key) {
      list.push({
        level: 'error',
        group: '场景·' + (s.title || '(无标题)'),
        title: '场景缺少 key',
        detail: '场景切换与下钻依赖唯一 key，缺失会导致切换异常。',
      });
      continue;
    }
    const n = (keySeen.get(key) ?? 0) + 1;
    keySeen.set(key, n);
    if (n === 2) {
      list.push({
        level: 'error',
        group: '场景·' + (s.title || key),
        title: `重复场景 key：${key}`,
        detail: '多个场景使用同一 key 会导致切换/下钻定位到错误场景。',
      });
    }
  }
  const sceneKeys = new Set(scenes.map((s) => (s.key ?? '').trim()).filter(Boolean));

  // ── 收集全部节点 id（供引用校验）──
  const allIds = new Set<string>();
  for (const s of scenes) {
    const collect = (nodes: EditorNode[] | undefined) => {
      for (const n of nodes ?? []) {
        allIds.add(n.id);
        if ((n as { children?: EditorNode[] }).children) collect((n as { children?: EditorNode[] }).children);
      }
    };
    collect(s.components);
    collect(s.layers);
  }

  const idSeen = new Map<string, string>();
  let totalNodes = 0;

  function checkCommon(n: EditorNode, sceneTitle: string, kindLabel: string) {
    // 重复 id
    if (idSeen.has(n.id)) {
      list.push({
        level: 'error',
        group: '场景·' + sceneTitle,
        title: `重复节点 id：${n.id}`,
        detail: `同时出现在「${idSeen.get(n.id)}」与「${sceneTitle}」`,
      });
    } else {
      idSeen.set(n.id, sceneTitle);
    }

    // 越界
    const { x, y, w, h } = posOf(n);
    if (x < 0 || y < 0 || x + w > cw + 1 || y + h > ch + 1) {
      list.push({
        level: 'warn',
        group: '场景·' + sceneTitle,
        title: `节点越界：${n.type}（${n.id}）`,
        detail: `位置 ${Math.round(x)},${Math.round(y)} 尺寸 ${Math.round(w)}×${Math.round(h)}，画布 ${cw}×${ch}`,
      });
    }

    const ds = n.dataSource as DataSource | undefined;

    // 悬空全局数据源引用
    if (n.dataSourceId && !managed.some((m) => m.id === n.dataSourceId)) {
      list.push({
        level: 'error',
        group: '场景·' + sceneTitle,
        title: `悬空数据源引用：${kindLabel}`,
        detail: `${n.id} 引用 dataSourceId="${n.dataSourceId}"，但全局数据源中不存在`,
      });
    }
    // 内联数据源无可取数内容
    if (!n.dataSourceId && ds && !hasFetchable(ds)) {
      list.push({
        level: 'warn',
        group: '场景·' + sceneTitle,
        title: `数据源未配置：${kindLabel}`,
        detail: `${n.id} 的内联数据源缺少可取数内容（url/query/staticData 等）`,
      });
    }
    // binding 指向不存在的节点/图层
    if (ds?.type === 'binding' && ds.source && !allIds.has(ds.source)) {
      list.push({
        level: 'error',
        group: '场景·' + sceneTitle,
        title: `绑定源不存在：${kindLabel}`,
        detail: `${n.id} 绑定 source="${ds.source}"，但场景中找不到该节点/图层`,
      });
    }
    // 图表 binding 缺少聚合字段
    if (
      ds?.type === 'binding' &&
      CHART_TYPES.includes(n.type) &&
      ds.aggregate !== undefined &&
      (FIELD_REQUIRED_AGGREGATES as string[]).includes(ds.aggregate) &&
      !ds.field
    ) {
      list.push({
        level: 'warn',
        group: '场景·' + sceneTitle,
        title: `图表聚合缺少字段：${n.type}`,
        detail: `${n.id} 使用聚合 "${ds.aggregate}" 但未指定 field，将取不到数值`,
      });
    }

    // deviceLayerId 指向不存在的设备图层
    const cfgObj = (n as { config?: Record<string, unknown> }).config ?? {};
    const layerId = cfgObj.deviceLayerId;
    if (typeof layerId === 'string' && layerId && DEVICE_BOUND_TYPES.includes(n.type) && !allIds.has(layerId)) {
      list.push({
        level: 'error',
        group: '场景·' + sceneTitle,
        title: `设备图层引用不存在：${n.type}`,
        detail: `${n.id} 的 deviceLayerId="${layerId}"，但场景中找不到该图层`,
      });
    }

    // 下钻场景引用悬空
    const drillKey = cfgObj.drillDownSceneKey;
    if (typeof drillKey === 'string' && drillKey && !sceneKeys.has(drillKey)) {
      list.push({
        level: 'error',
        group: '场景·' + sceneTitle,
        title: `下钻场景不存在：${n.type}`,
        detail: `${n.id} 的 drillDownSceneKey="${drillKey}"，但场景列表中不存在该 key`,
      });
    }

    // 阈值规则不完整：填了监控字段却没有阈值
    if (typeof cfgObj.thrField === 'string' && cfgObj.thrField && cfgObj.thrWarn === undefined && cfgObj.thrCrit === undefined) {
      list.push({
        level: 'warn',
        group: '场景·' + sceneTitle,
        title: `阈值规则不完整：${n.type}`,
        detail: `${n.id} 指定了监控字段 "${cfgObj.thrField}"，但未设置预警/告警阈值`,
      });
    }
  }

  function walk(node: EditorNode, sceneTitle: string) {
    totalNodes += 1;
    checkCommon(node, sceneTitle, node.type);
    const children = (node as { children?: EditorNode[] }).children;
    if (children) children.forEach((c) => walk(c, sceneTitle));
  }
  function walkLayer(l: MapLayer, sceneTitle: string) {
    totalNodes += 1;
    checkCommon(l as EditorNode, sceneTitle, `图层·${l.type}`);
  }

  for (const s of scenes) {
    const title = s.title || s.key || '(无标题)';
    s.components?.forEach((c) => walk(c, title));
    s.layers?.forEach((l) => walkLayer(l, title));
    if (s.map?.tiles === 'tianditu') {
      list.push({
        level: 'info',
        group: '场景·' + title,
        title: '使用天地图底图',
        detail: '未配置天地图 Token 时底图会回退到内置暗色底图（可在「底图设置」中配置）。',
      });
    }
  }

  list.unshift({
    level: 'ok',
    group: '概览',
    title: `共 ${scenes.length} 个场景 · ${totalNodes} 个节点 · ${managed.length} 个数据源`,
  });
  if (managed.length === 0) {
    list.push({
      level: 'info',
      group: '配置',
      title: '尚未创建任何数据源',
      detail: '需要实时数据的组件请先通过「数据源」面板创建。',
    });
  }

  return list;
}
